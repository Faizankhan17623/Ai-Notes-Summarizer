const mongoose = require('mongoose')
const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const User = require('../Models/User')

const { consumeCredit, getUserPlan } = require('../utils/Plans')
const { buildFlashcardPrompt, buildQuizPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { schedule } = require('../utils/SpacedRepetition')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'qwen/qwen3-32b'

// on-demand flashcard/quiz generation is a Pro+ feature sir — same gate as the rest of the study tools
const requirePaidPlan = async (userId, res) => {
    const plan = await getUserPlan(userId)
    if (!plan || plan.key === 'Basic') {
        res.status(403).json({
            success: false,
            message: 'Generating flashcards and quizzes on demand is a Pro / Pro Max feature, please upgrade to use it',
        })
        return null
    }
    return plan
}

// strips the model's <think> block + stray code fences, shared by both generators sir
const cleanJson = (raw) => {
    if (raw.includes('</think>')) raw = raw.split('</think>').pop()
    return raw.replace(/```json/gi, '').replace(/```/g, '').trim()
}

const loadOwnedNote = async (noteId, userId) => {
    if (!mongoose.isValidObjectId(noteId)) return null
    return Note.findOne({ _id: noteId, user: userId })
}

// POST /notes/:noteId/flashcards — generate `count` new flashcards for a note sir, costs one credit
exports.generateFlashcards = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params
        const count = Math.min(Math.max(parseInt(req.body?.count) || 10, 1), 20)

        const note = await loadOwnedNote(noteId, id)
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        const plan = await requirePaidPlan(id, res)
        if (!plan) return

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message })
        }

        const existing = await Flashcard.find({ note: note._id }).select('front').limit(50)
        const prompt = buildFlashcardPrompt(note.rawText, count, existing.map((c) => c.front))

        const t0 = Date.now()
        let invoking
        try {
            invoking = await groq.chat.completions.create({
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Return only the JSON.' }],
                model: MODEL,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'flashcard', plan: spend.plan, model: MODEL, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'flashcard', plan: spend.plan, model: MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({ success: false, message: 'The AI returned an empty response, please try again' })
        }

        let parsed
        try {
            parsed = JSON.parse(cleanJson(raw))
        } catch (parseErr) {
            console.log('Flashcard JSON parse failed:', parseErr.message)
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        const cards = Array.isArray(parsed.flashcards) ? parsed.flashcards : []
        if (cards.length === 0) {
            return res.status(502).json({ success: false, message: 'The AI did not return any flashcards, please try again' })
        }

        const created = await Flashcard.insertMany(
            cards.map((c) => ({ user: id, note: note._id, front: c.front, back: c.back }))
        )

        return res.status(201).json({ success: true, flashcards: created })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while generating flashcards' })
    }
}

// GET /notes/:noteId/flashcards — all cards for a note sir
exports.getFlashcardsForNote = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        const note = await loadOwnedNote(noteId, id)
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        const flashcards = await Flashcard.find({ note: note._id }).sort({ createdAt: 1 })
        return res.status(200).json({ success: true, flashcards })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load flashcards' })
    }
}

// GET /flashcards/due — every card across all notes that's due for review right now sir, for the review dashboard
exports.getDueFlashcards = async (req, res) => {
    try {
        const id = req.User.id
        const flashcards = await Flashcard.find({ user: id, dueDate: { $lte: new Date() } })
            .populate('note', 'title')
            .sort({ dueDate: 1 })
            .limit(50)

        return res.status(200).json({ success: true, flashcards })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load due flashcards' })
    }
}

// POST /flashcards/:id/review — record a spaced-repetition review sir, body: { rating: 'again'|'hard'|'good'|'easy' }
exports.reviewFlashcard = async (req, res) => {
    try {
        const id = req.User.id
        const { id: cardId } = req.params
        const { rating } = req.body

        if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
            return res.status(400).json({ success: false, message: 'Rating must be one of: again, hard, good, easy' })
        }

        const card = await Flashcard.findOne({ _id: cardId, user: id })
        if (!card) {
            return res.status(404).json({ success: false, message: 'Flashcard not found' })
        }

        const next = schedule(card, rating)
        card.easeFactor = next.easeFactor
        card.interval = next.interval
        card.reviewCount = next.reviewCount
        card.dueDate = next.dueDate
        card.lastReviewedAt = new Date()
        await card.save()

        // daily study streak sir — same calendar day check by UTC date string, not a 24h delta,
        // so "yesterday 11pm then today 1am" correctly counts as two different days
        const dayKey = (d) => d.toISOString().slice(0, 10)
        const today = new Date()
        const user = await User.findById(id).select('currentStreak lastStreakDate')

        if (!user.lastStreakDate) {
            user.currentStreak = 1
        } else {
            const last = dayKey(user.lastStreakDate)
            const now = dayKey(today)
            if (last !== now) {
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
                user.currentStreak = last === dayKey(yesterday) ? user.currentStreak + 1 : 1
            }
            // else: already reviewed something today sir — no change, this isn't a second day
        }
        user.lastStreakDate = today
        await user.save()

        return res.status(200).json({ success: true, flashcard: card })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to record the review' })
    }
}

// DELETE /flashcards/:id sir
exports.deleteFlashcard = async (req, res) => {
    try {
        const id = req.User.id
        const { id: cardId } = req.params

        const card = await Flashcard.findOneAndDelete({ _id: cardId, user: id })
        if (!card) {
            return res.status(404).json({ success: false, message: 'Flashcard not found' })
        }

        return res.status(200).json({ success: true, message: 'Flashcard deleted' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to delete the flashcard' })
    }
}

// POST /notes/:noteId/quiz — generate a new quiz for a note sir, costs one credit
exports.generateQuiz = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params
        const count = Math.min(Math.max(parseInt(req.body?.count) || 8, 1), 15)

        const note = await loadOwnedNote(noteId, id)
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        const plan = await requirePaidPlan(id, res)
        if (!plan) return

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message })
        }

        const existingQuizzes = await Quiz.find({ note: note._id }).select('questions.question').limit(10)
        const existingQuestions = existingQuizzes.flatMap((q) => q.questions.map((qq) => qq.question))
        const prompt = buildQuizPrompt(note.rawText, count, existingQuestions)

        const t0 = Date.now()
        let invoking
        try {
            invoking = await groq.chat.completions.create({
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Return only the JSON.' }],
                model: MODEL,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'quiz', plan: spend.plan, model: MODEL, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'quiz', plan: spend.plan, model: MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({ success: false, message: 'The AI returned an empty response, please try again' })
        }

        let parsed
        try {
            parsed = JSON.parse(cleanJson(raw))
        } catch (parseErr) {
            console.log('Quiz JSON parse failed:', parseErr.message)
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        const questions = Array.isArray(parsed.questions) ? parsed.questions : []
        if (questions.length === 0) {
            return res.status(502).json({ success: false, message: 'The AI did not return any quiz questions, please try again' })
        }

        const quiz = await Quiz.create({ user: id, note: note._id, questions })

        return res.status(201).json({ success: true, quiz })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while generating the quiz' })
    }
}

// GET /notes/:noteId/quizzes sir
exports.getQuizzesForNote = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        const note = await loadOwnedNote(noteId, id)
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        const quizzes = await Quiz.find({ note: note._id }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, quizzes })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load quizzes' })
    }
}

// POST /quizzes/:id/attempt — record an attempt sir, body: { answers: [optionIndex, ...] }
exports.attemptQuiz = async (req, res) => {
    try {
        const id = req.User.id
        const { id: quizId } = req.params
        const { answers } = req.body

        if (!Array.isArray(answers)) {
            return res.status(400).json({ success: false, message: 'Answers must be an array of option indexes' })
        }

        const quiz = await Quiz.findOne({ _id: quizId, user: id })
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' })
        }

        const score = quiz.questions.reduce(
            (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
            0
        )

        quiz.lastAttempt = { score, total: quiz.questions.length, answers, attemptedAt: new Date() }
        await quiz.save()

        return res.status(200).json({ success: true, score, total: quiz.questions.length, quiz })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to record the attempt' })
    }
}

// DELETE /quizzes/:id sir
exports.deleteQuiz = async (req, res) => {
    try {
        const id = req.User.id
        const { id: quizId } = req.params

        const quiz = await Quiz.findOneAndDelete({ _id: quizId, user: id })
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' })
        }

        return res.status(200).json({ success: true, message: 'Quiz deleted' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to delete the quiz' })
    }
}
