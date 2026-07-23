const mongoose = require('mongoose')
const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const User = require('../Models/User')
const { ObjectId } = mongoose.Types

const { consumeCredit, getUserPlan, DEFAULT_MODEL } = require('../utils/Plans')
const { buildFlashcardPrompt, buildQuizPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { schedule } = require('../utils/SpacedRepetition')
const { recordStudyActivity } = require('../utils/Streak')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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
        // 20k-char cap sir — Groq free tier allows 8,000 tokens/min (same cap as AI.js/Chat.js)
        const prompt = buildFlashcardPrompt(note.rawText.slice(0, 20000), count, existing.map((c) => c.front))

        const model = spend.model || DEFAULT_MODEL
        const t0 = Date.now()
        let invoking
        try {
            invoking = await groq.chat.completions.create({
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Return only the JSON.' }],
                model,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'flashcard', plan: spend.plan, model, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'flashcard', plan: spend.plan, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
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

        const user = await User.findById(id).select('currentStreak lastStreakDate longestStreak')
        await recordStudyActivity(user)

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
        // 20k-char cap sir — Groq free tier allows 8,000 tokens/min (same cap as AI.js/Chat.js)
        const prompt = buildQuizPrompt(note.rawText.slice(0, 20000), count, existingQuestions)

        const model = spend.model || DEFAULT_MODEL
        const t0 = Date.now()
        let invoking
        try {
            invoking = await groq.chat.completions.create({
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Return only the JSON.' }],
                model,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'quiz', plan: spend.plan, model, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'quiz', plan: spend.plan, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
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

        const user = await User.findById(id).select('currentStreak lastStreakDate longestStreak')
        await recordStudyActivity(user)

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

// minimum sample sizes before a tag is confident enough to call "weak" sir — a single hard
// flashcard or one missed question shouldn't paint an entire topic red
const MIN_FLASHCARD_REVIEWS_PER_TAG = 3
const MIN_QUIZ_ANSWERS_PER_TAG = 3

// GET /study/weak-topics — surfaces which of the user's note TAGS they're actually struggling
// with, mined from data already being recorded (SM-2 ease factor per flashcard, right/wrong
// per quiz question) rather than a new tracking mechanism. Two independent signals feed one
// ranked list sir:
//   - flashcards: a LOWER easeFactor means the SM-2 algorithm has downgraded that card because
//     of 'again'/'hard' ratings, so avg ease per tag is a direct difficulty signal
//   - quizzes: each question's index maps 1:1 to quiz.questions, so lastAttempt.answers[i] vs
//     questions[i].correctIndex gives a wrong/right per question, rolled up by the note's tags
// A note with no tags contributes to neither signal (nothing to group it by) — this is a
// tags-only view, matching how Notes/History organizes everything else in the app.
exports.getWeakTopics = async (req, res) => {
    try {
        const userId = new ObjectId(req.User.id)

        const [flashcardStats, quizNotes] = await Promise.all([
            // avg ease + review count per tag sir — only cards that have actually been
            // reviewed at least once carry a meaningful ease signal (unreviewed cards sit at
            // the schema default of 2.5, which would just dilute the average toward "fine")
            Flashcard.aggregate([
                { $match: { user: userId, reviewCount: { $gt: 0 } } },
                { $lookup: { from: 'notes', localField: 'note', foreignField: '_id', as: 'noteDoc' } },
                { $unwind: '$noteDoc' },
                { $unwind: '$noteDoc.tags' },
                { $group: { _id: '$noteDoc.tags', avgEase: { $avg: '$easeFactor' }, reviewedCards: { $sum: 1 } } },
            ]),
            // quizzes with an attempt, joined to their note's tags sir — the per-question
            // right/wrong tally happens in JS below since it needs each question's
            // correctIndex compared against the matching answers[i], not something Mongo's
            // aggregation pipeline expresses cleanly
            Quiz.find({ user: userId, 'lastAttempt.answers': { $exists: true, $ne: [] } })
                .populate('note', 'tags')
                .select('questions lastAttempt note'),
        ])

        const quizTagStats = new Map() // tag -> { wrong, total }
        for (const quiz of quizNotes) {
            const tags = quiz.note?.tags || []
            if (tags.length === 0) continue
            quiz.questions.forEach((q, i) => {
                const answered = quiz.lastAttempt.answers[i]
                if (answered === undefined || answered === null) return
                const wrong = answered !== q.correctIndex
                tags.forEach((tag) => {
                    const entry = quizTagStats.get(tag) || { wrong: 0, total: 0 }
                    entry.total += 1
                    if (wrong) entry.wrong += 1
                    quizTagStats.set(tag, entry)
                })
            })
        }

        const tagMap = new Map() // tag -> { tag, avgEase, reviewedCards, wrongRate, quizAnswers }
        flashcardStats.forEach((row) => {
            if (row.reviewedCards < MIN_FLASHCARD_REVIEWS_PER_TAG) return
            tagMap.set(row._id, { tag: row._id, avgEase: row.avgEase, reviewedCards: row.reviewedCards, wrongRate: null, quizAnswers: 0 })
        })
        quizTagStats.forEach((stats, tag) => {
            if (stats.total < MIN_QUIZ_ANSWERS_PER_TAG) return
            const entry = tagMap.get(tag) || { tag, avgEase: null, reviewedCards: 0, wrongRate: null, quizAnswers: 0 }
            entry.wrongRate = stats.wrong / stats.total
            entry.quizAnswers = stats.total
            tagMap.set(tag, entry)
        })

        // one 0-1 "difficulty" score per tag sir, combining whichever signals are present —
        // ease is inverted and normalized against the 1.3-2.5 SM-2 range so both signals sit
        // on the same scale before averaging. A tag with only one signal just uses that one.
        const weakTopics = Array.from(tagMap.values())
            .map((row) => {
                const easeScore = row.avgEase !== null ? Math.min(1, Math.max(0, (2.5 - row.avgEase) / (2.5 - 1.3))) : null
                const scores = [easeScore, row.wrongRate].filter((s) => s !== null)
                const difficulty = scores.reduce((a, b) => a + b, 0) / scores.length
                return { ...row, difficulty }
            })
            .filter((row) => row.difficulty > 0)
            .sort((a, b) => b.difficulty - a.difficulty)
            .slice(0, 10)

        return res.status(200).json({ success: true, weakTopics })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load weak-topic analytics' })
    }
}
