const mongoose = require('mongoose')
const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const Exam = require('../Models/Exam')
const User = require('../Models/User')
const StudyPlan = require('../Models/StudyPlan')
const AdaptiveSession = require('../Models/AdaptiveSession')
const { ObjectId } = mongoose.Types

const { consumeCredit, getUserPlan, DEFAULT_MODEL } = require('../utils/Plans')
const { buildFlashcardPrompt, buildQuizPrompt, buildExamPrompt, buildStudyPlanPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { schedule } = require('../utils/SpacedRepetition')
const { recordStudyActivity, dayKey } = require('../utils/Streak')
const { computeWeakTopics } = require('../utils/WeakTopics')

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
        await recordStudyActivity(user, req.User.tzOffsetMinutes)

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
        await recordStudyActivity(user, req.User.tzOffsetMinutes)

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

const MAX_EXAM_NOTES = 10
const MAX_EXAM_QUESTIONS = 40

// POST /study/exam/generate sir — { noteIds, count?, timeLimitSeconds? }. Like generateQuiz
// but spans multiple notes: one Groq call sees all of them at once (so it can spread
// questions across the material) rather than concatenating N separate per-note quizzes.
exports.generateExam = async (req, res) => {
    try {
        const id = req.User.id
        const { noteIds, timeLimitSeconds } = req.body
        const count = Math.min(Math.max(parseInt(req.body?.count) || 15, 4), MAX_EXAM_QUESTIONS)

        if (!Array.isArray(noteIds) || noteIds.length === 0 || noteIds.length > MAX_EXAM_NOTES) {
            return res.status(400).json({ success: false, message: `Choose between 1 and ${MAX_EXAM_NOTES} notes for the exam` })
        }
        if (noteIds.some((n) => !mongoose.isValidObjectId(n))) {
            return res.status(400).json({ success: false, message: 'Invalid note id in the list' })
        }

        const notes = await Note.find({ _id: { $in: noteIds }, user: id }).select('title rawText')
        // dedupe against noteIds.length sir — $in naturally collapses duplicate ids, so a
        // caller-sent repeat (e.g. [A, A, B]) would otherwise false-404 even though every note
        // is valid and owned (same fix as createChat above)
        if (notes.length !== new Set(noteIds).size) {
            return res.status(404).json({ success: false, message: 'One or more of those notes could not be found' })
        }
        // keep the exam's note order matching what the caller sent sir — Note.find doesn't
        // guarantee $in order, and question.noteIndex below must line up with `sections`
        const notesById = new Map(notes.map((n) => [String(n._id), n]))
        const orderedNotes = [...new Set(noteIds)].map((nid) => notesById.get(nid))

        const plan = await requirePaidPlan(id, res)
        if (!plan) return

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message })
        }

        // 20k-char combined cap sir — same Groq free-tier reasoning as buildQuizPrompt,
        // split evenly across however many notes are in this exam
        const perNoteCap = Math.floor(20000 / orderedNotes.length)
        const sections = orderedNotes.map((n) => ({ title: n.title, text: n.rawText.slice(0, perNoteCap) }))
        const examPrompt = buildExamPrompt(sections, count)

        const model = spend.model || DEFAULT_MODEL
        const t0 = Date.now()
        let invoking
        try {
            invoking = await groq.chat.completions.create({
                messages: [{ role: 'system', content: examPrompt }, { role: 'user', content: 'Return only the JSON.' }],
                model,
                temperature: 0.4,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'exam', plan: spend.plan, model, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'exam', plan: spend.plan, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
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
            console.log('Exam JSON parse failed:', parseErr.message)
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : []
        if (rawQuestions.length === 0) {
            return res.status(502).json({ success: false, message: 'The AI did not return any exam questions, please try again' })
        }

        // map each question's noteIndex back to a real note id sir, dropping anything the
        // model returned an out-of-range index for rather than failing the whole exam
        const questions = rawQuestions
            .filter((q) => Number.isInteger(q.noteIndex) && q.noteIndex >= 0 && q.noteIndex < orderedNotes.length)
            .map((q) => ({
                question: q.question,
                options: q.options,
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                note: orderedNotes[q.noteIndex]._id,
            }))

        if (questions.length === 0) {
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        const title = orderedNotes.length === 1
            ? `Exam: ${orderedNotes[0].title}`
            : `Exam: ${orderedNotes[0].title} + ${orderedNotes.length - 1} more`

        const exam = await Exam.create({
            user: id,
            title,
            notes: orderedNotes.map((n) => n._id),
            timeLimitSeconds: Number.isInteger(timeLimitSeconds) && timeLimitSeconds > 0 ? timeLimitSeconds : null,
            questions,
        })

        return res.status(201).json({ success: true, exam })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while generating the exam' })
    }
}

// GET /study/exams sir — the user's exam list, questions omitted to keep the payload light
exports.getExams = async (req, res) => {
    try {
        const id = req.User.id
        const exams = await Exam.find({ user: id })
            .select('title notes timeLimitSeconds attempts createdAt')
            .populate('notes', 'title')
            .sort({ createdAt: -1 })
        return res.status(200).json({ success: true, exams })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load exams' })
    }
}

// GET /study/exams/:id sir — full exam including questions, for taking/reviewing it
exports.getExam = async (req, res) => {
    try {
        const id = req.User.id
        const { id: examId } = req.params

        if (!mongoose.isValidObjectId(examId)) {
            return res.status(400).json({ success: false, message: 'Invalid exam id' })
        }

        const exam = await Exam.findOne({ _id: examId, user: id }).populate('notes', 'title')
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' })
        }

        return res.status(200).json({ success: true, exam })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load the exam' })
    }
}

// POST /study/exams/:id/attempt sir — { answers, durationSeconds? }. Unlike Quiz.lastAttempt
// (overwrite-only), every attempt is APPENDED so score-over-time / retake history is visible
exports.attemptExam = async (req, res) => {
    try {
        const id = req.User.id
        const { id: examId } = req.params
        const { answers, durationSeconds } = req.body

        if (!mongoose.isValidObjectId(examId)) {
            return res.status(400).json({ success: false, message: 'Invalid exam id' })
        }
        if (!Array.isArray(answers)) {
            return res.status(400).json({ success: false, message: 'Answers must be an array of option indexes' })
        }

        const exam = await Exam.findOne({ _id: examId, user: id })
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' })
        }

        const score = exam.questions.reduce(
            (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
            0
        )

        exam.attempts.push({
            score,
            total: exam.questions.length,
            answers,
            durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.round(durationSeconds)) : undefined,
            attemptedAt: new Date(),
        })
        await exam.save()

        const user = await User.findById(id).select('currentStreak lastStreakDate longestStreak')
        await recordStudyActivity(user, req.User.tzOffsetMinutes)

        return res.status(200).json({ success: true, score, total: exam.questions.length, exam })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to record the exam attempt' })
    }
}

// DELETE /study/exams/:id sir
exports.deleteExam = async (req, res) => {
    try {
        const id = req.User.id
        const { id: examId } = req.params

        const exam = await Exam.findOneAndDelete({ _id: examId, user: id })
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' })
        }

        return res.status(200).json({ success: true, message: 'Exam deleted' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to delete the exam' })
    }
}

// Creates targeted remediation from the latest wrong answers. One bounded Groq request returns
// explanations and cards; cards are due immediately so the existing review queue adapts.
exports.generateAdaptivePractice = async (req, res) => {
    try {
        const id = req.User.id; const { sourceType, sourceId } = req.body
        if (!['quiz', 'exam'].includes(sourceType) || !mongoose.isValidObjectId(sourceId)) return res.status(400).json({ success: false, message: 'A valid quiz or exam is required' })
        const source = sourceType === 'quiz' ? await Quiz.findOne({ _id: sourceId, user: id }) : await Exam.findOne({ _id: sourceId, user: id })
        if (!source) return res.status(404).json({ success: false, message: 'Practice attempt not found' })
        const attempt = sourceType === 'quiz' ? source.lastAttempt : source.attempts?.at(-1)
        if (!attempt) return res.status(400).json({ success: false, message: 'Complete an attempt first' })
        const wrong = source.questions.map((q, i) => ({ q, answer: attempt.answers[i] })).filter(x => x.answer !== x.q.correctIndex)
        if (!wrong.length) return res.json({ success: true, message: 'Excellent work — no weak answers to remediate', cards: [], explanations: [], progress: await AdaptiveSession.find({ user: id }).sort({ createdAt: -1 }).limit(10) })
        const noteIds = sourceType === 'quiz' ? [source.note] : [...new Set(wrong.map(x => String(x.q.note)))]
        const notes = await Note.find({ _id: { $in: noteIds }, user: id }).select('title rawText tags')
        const context = notes.map(n => `${n.title}: ${n.rawText.slice(0, Math.floor(12000 / Math.max(notes.length, 1)))}`).join('\n\n')
        const prompt = `You are a study tutor. Using ONLY these notes, remediate the incorrectly answered questions. Return JSON only: {"items":[{"question":"...","correctAnswer":"...","explanation":"short explanation grounded in notes","front":"flashcard question","back":"flashcard answer","topic":"one note topic"}]}\nNOTES:\n${context}\nWRONG QUESTIONS:\n${wrong.slice(0, 12).map(x => `Question: ${x.q.question}\nChosen: ${x.q.options[x.answer] || 'not answered'}\nCorrect: ${x.q.options[x.q.correctIndex]}`).join('\n\n')}`
        const plan = await requirePaidPlan(id, res); if (!plan) return
        const spend = await consumeCredit(id); if (!spend.ok) return res.status(403).json({ success: false, message: spend.message })
        const invoking = await groq.chat.completions.create({ messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Return only JSON.' }], model: spend.model || DEFAULT_MODEL, temperature: 0.2, response_format: { type: 'json_object' } })
        const parsed = JSON.parse(cleanJson(invoking.choices?.[0]?.message?.content || '{}')); const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 12) : []
        const cards = await Flashcard.insertMany(items.filter(x => x.front && x.back).map(x => ({ user: id, note: notes.find(n => n.tags?.includes(x.topic))?._id || notes[0]._id, front: String(x.front).slice(0, 500), back: String(x.back).slice(0, 1000), dueDate: new Date() })))
        const topics = [...new Set(items.map(x => x.topic).filter(Boolean))]
        const sessions = await AdaptiveSession.create({ user: id, sourceType, source: sourceId, score: attempt.score, total: attempt.total, wrongTopics: topics, cardsCreated: cards.length })
        const exam = await Exam.findOne({ user: id, schedule: { $elemMatch: { done: false } } })
        if (exam) { const day = exam.schedule.find(d => !d.done); if (day) { day.task = `Adaptive practice: ${topics.slice(0, 2).join(', ') || 'weak questions'}`; day.minutes = Math.max(day.minutes || 30, 20); await exam.save() } }
        return res.json({ success: true, cards, explanations: items, topics, progress: await AdaptiveSession.find({ user: id }).sort({ createdAt: -1 }).limit(10), message: `${cards.length} targeted flashcards added to your review queue` })
    } catch (error) { console.log(error.message); return res.status(500).json({ success: false, message: 'Could not build adaptive practice' }) }
}

const makeExamSchedule = (exam) => {
    if (!exam.examDate) return []
    const start = new Date(exam.prepStartDate || new Date())
    const end = new Date(exam.examDate)
    const days = []
    for (let day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
        const index = days.length
        days.push({ date: day.toISOString().slice(0, 10), minutes: exam.dailyMinutes || 30, note: exam.notes[index % Math.max(exam.notes.length, 1)], task: index % 2 ? 'Practice questions' : 'Review notes', done: false })
    }
    return days
}

exports.getExamSchedule = async (req, res) => {
    try {
        const exam = await Exam.findOne({ _id: req.params.id, user: req.User.id }).populate('notes', 'title')
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' })
        if (!exam.schedule?.length && exam.examDate) { exam.schedule = makeExamSchedule(exam); await exam.save() }
        return res.json({ success: true, schedule: exam.schedule || [], examDate: exam.examDate, prepStartDate: exam.prepStartDate, dailyMinutes: exam.dailyMinutes })
    } catch (error) { return res.status(500).json({ success: false, message: 'Failed to load exam schedule' }) }
}

exports.updateExamSchedule = async (req, res) => {
    try {
        const { examDate, prepStartDate, dailyMinutes } = req.body
        const date = new Date(examDate); const start = prepStartDate ? new Date(prepStartDate) : new Date()
        if (!examDate || Number.isNaN(date.getTime()) || date <= start) return res.status(400).json({ success: false, message: 'Choose a future exam date after the preparation start date' })
        const exam = await Exam.findOne({ _id: req.params.id, user: req.User.id }).populate('notes', 'title')
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' })
        exam.examDate = date; exam.prepStartDate = start; exam.dailyMinutes = Math.min(240, Math.max(10, Number(dailyMinutes) || 30)); exam.schedule = makeExamSchedule(exam); await exam.save()
        return res.json({ success: true, schedule: exam.schedule, examDate: exam.examDate, prepStartDate: exam.prepStartDate, dailyMinutes: exam.dailyMinutes })
    } catch (error) { return res.status(500).json({ success: false, message: 'Failed to save exam schedule' }) }
}

exports.toggleExamScheduleItem = async (req, res) => {
    try {
        const exam = await Exam.findOne({ _id: req.params.id, user: req.User.id })
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' })
        const item = exam.schedule.find(day => day.date === req.params.date)
        if (!item) return res.status(404).json({ success: false, message: 'Calendar day not found' })
        item.done = !item.done; await exam.save()
        return res.json({ success: true, item })
    } catch (error) { return res.status(500).json({ success: false, message: 'Failed to update calendar progress' }) }
}

// GET /study/weak-topics — surfaces which of the user's note TAGS they're actually struggling
// with. The actual computation lives in utils/WeakTopics.js (shared with the weekly AI digest
// job) sir — mined from data already being recorded (SM-2 ease factor per flashcard, right/wrong
// per quiz question) rather than a new tracking mechanism. Two independent signals feed one
// ranked list:
//   - flashcards: a LOWER easeFactor means the SM-2 algorithm has downgraded that card because
//     of 'again'/'hard' ratings, so avg ease per tag is a direct difficulty signal
//   - quizzes: each question's index maps 1:1 to quiz.questions, so lastAttempt.answers[i] vs
//     questions[i].correctIndex gives a wrong/right per question, rolled up by the note's tags
// A note with no tags contributes to neither signal (nothing to group it by) — this is a
// tags-only view, matching how Notes/History organizes everything else in the app.
exports.getWeakTopics = async (req, res) => {
    try {
        const weakTopics = await computeWeakTopics(req.User.id)
        return res.status(200).json({ success: true, weakTopics })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load weak-topic analytics' })
    }
}

// ---------- AI study plan ----------
// turns signals that are already being computed elsewhere (weak topics above, due flashcards,
// unattempted quizzes, recently-created notes) into a short ordered daily task list sir

const MAX_PLAN_ITEMS = 6

// gathers real, available study tasks for a user right now sir — same "mine from existing
// data" philosophy as getWeakTopics, just widened to flashcards/quizzes/notes as candidates
// instead of tag-level stats. Returns a flat candidate list the AI prompt can only choose from.
const gatherPlanCandidates = async (userId) => {
    const userObjectId = new ObjectId(userId)

    const [dueCards, openQuizzes, recentNotes] = await Promise.all([
        Flashcard.find({ user: userId, dueDate: { $lte: new Date() } })
            .populate('note', 'title')
            .sort({ dueDate: 1 })
            .limit(30),
        Quiz.find({ user: userId, 'lastAttempt.answers': { $exists: false } })
            .populate('note', 'title')
            .sort({ createdAt: -1 })
            .limit(10),
        Note.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('title tags'),
    ])

    const candidates = []

    // group due cards by note sir — one "flashcards" task per note, not one per card, so the
    // plan stays a handful of items instead of listing every single due card individually
    const cardsByNote = new Map()
    dueCards.forEach((card) => {
        if (!card.note) return
        const key = String(card.note._id)
        const entry = cardsByNote.get(key) || { note: card.note, count: 0 }
        entry.count += 1
        cardsByNote.set(key, entry)
    })
    cardsByNote.forEach(({ note, count }) => {
        candidates.push({
            type: 'flashcards',
            title: `Review ${count} flashcard${count === 1 ? '' : 's'} — ${note.title}`,
            reason: `${count} card${count === 1 ? ' is' : 's are'} due for spaced-repetition review`,
            note: note._id,
            estimatedMinutes: Math.min(20, Math.max(5, count * 1)),
        })
    })

    openQuizzes.forEach((quiz) => {
        if (!quiz.note) return
        candidates.push({
            type: 'quiz',
            title: `Take the quiz on ${quiz.note.title}`,
            reason: 'This quiz has not been attempted yet',
            note: quiz.note._id,
            estimatedMinutes: Math.min(15, Math.max(5, quiz.questions.length)),
        })
    })

    recentNotes.forEach((note) => {
        candidates.push({
            type: 'review_note',
            title: `Re-read ${note.title}`,
            reason: 'A recently added note worth reinforcing',
            note: note._id,
            estimatedMinutes: 8,
        })
    })

    return candidates
}

// picks the hour (0-23) with the most flashcard-review activity sir — same signal
// controllers/Analytics.js's getMyAnalytics "best time to study" uses, just reduced to a
// single top hour here instead of the full byHour breakdown. null if there's no history yet.
const getSuggestedHour = async (userId) => {
    const rows = await Flashcard.aggregate([
        { $match: { user: new ObjectId(userId), lastReviewedAt: { $ne: null } } },
        { $group: { _id: { $hour: '$lastReviewedAt' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
    ])
    return rows.length ? rows[0]._id : null
}

// POST /study/plan/generate — builds (or returns the already-generated) plan for today sir,
// Pro+ only, costs one credit like flashcard/quiz generation. Idempotent per calendar day:
// calling this again the same day just returns the existing plan untouched, so a user can't
// burn credits regenerating and it never discards items they've already checked off.
exports.generateStudyPlan = async (req, res) => {
    try {
        const id = req.User.id
        const today = dayKey(new Date(), req.User.tzOffsetMinutes)

        const existing = await StudyPlan.findOne({ user: id, dayKey: today })
        if (existing) {
            return res.status(200).json({ success: true, plan: existing, reused: true })
        }

        const plan = await requirePaidPlan(id, res)
        if (!plan) return

        const candidates = await gatherPlanCandidates(id)
        if (candidates.length === 0) {
            return res.status(200).json({
                success: true,
                plan: null,
                message: 'Nothing due today — generate a note or flashcards first to build a plan',
            })
        }

        const spend = await consumeCredit(id)
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message })
        }

        const suggestedHour = await getSuggestedHour(id)
        const prompt = buildStudyPlanPrompt(candidates, MAX_PLAN_ITEMS)

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
            logAi({ user: id, type: 'studyPlan', plan: spend.plan, model, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'studyPlan', plan: spend.plan, model, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
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
            console.log('Study plan JSON parse failed:', parseErr.message)
            return res.status(502).json({ success: false, message: 'The AI response was not in the expected format, please try again' })
        }

        const picks = Array.isArray(parsed.items) ? parsed.items : []
        // only trust indexes that actually exist in the candidate list the model was given sir —
        // guards against a hallucinated out-of-range index crashing the item build below
        const items = picks
            .filter((p) => Number.isInteger(p.index) && p.index >= 1 && p.index <= candidates.length)
            .slice(0, MAX_PLAN_ITEMS)
            .map((p) => {
                const c = candidates[p.index - 1]
                return {
                    type: c.type,
                    title: c.title,
                    reason: typeof p.reason === 'string' && p.reason.trim() ? p.reason.trim().slice(0, 300) : c.reason,
                    note: c.note || null,
                    estimatedMinutes: c.estimatedMinutes,
                }
            })

        if (items.length === 0) {
            return res.status(502).json({ success: false, message: 'The AI did not return a usable plan, please try again' })
        }

        const created = await StudyPlan.create({ user: id, dayKey: today, items, suggestedHour })

        return res.status(201).json({ success: true, plan: created })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while building your study plan' })
    }
}

// GET /study/plan/today sir — never generates, just returns today's plan if one already exists
exports.getTodayStudyPlan = async (req, res) => {
    try {
        const id = req.User.id
        const today = dayKey(new Date(), req.User.tzOffsetMinutes)
        const plan = await StudyPlan.findOne({ user: id, dayKey: today })
        return res.status(200).json({ success: true, plan })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load today\'s study plan' })
    }
}

// PATCH /study/plan/:planId/items/:itemId — toggle one item done/not-done sir
exports.toggleStudyPlanItem = async (req, res) => {
    try {
        const id = req.User.id
        const { planId, itemId } = req.params

        const plan = await StudyPlan.findOne({ _id: planId, user: id })
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Study plan not found' })
        }

        const item = plan.items.id(itemId)
        if (!item) {
            return res.status(404).json({ success: false, message: 'Study plan item not found' })
        }

        item.done = !item.done
        await plan.save()

        if (item.done) {
            const user = await User.findById(id).select('currentStreak lastStreakDate longestStreak')
            await recordStudyActivity(user, req.User.tzOffsetMinutes)
        }

        return res.status(200).json({ success: true, plan })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to update the study plan item' })
    }
}
