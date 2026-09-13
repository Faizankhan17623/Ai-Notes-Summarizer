const mongoose = require('mongoose')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const Exam = require('../Models/Exam')
const { ObjectId } = mongoose.Types

// minimum sample sizes before a tag is confident enough to call "weak" sir — a single hard
// flashcard or one missed question shouldn't paint an entire topic red
const MIN_FLASHCARD_REVIEWS_PER_TAG = 3
const MIN_QUIZ_ANSWERS_PER_TAG = 3

// shared by GET /study/weak-topics (controllers/StudyKit.js) AND the weekly AI digest
// (utils/DigestJob.js) sir — surfaces which of the user's note TAGS they're actually
// struggling with, mined from data already being recorded (SM-2 ease factor per flashcard,
// right/wrong per quiz/exam question) rather than a new tracking mechanism. Two independent
// signals feed one ranked list:
//   - flashcards: a LOWER easeFactor means the SM-2 algorithm has downgraded that card because
//     of 'again'/'hard' ratings, so avg ease per tag is a direct difficulty signal
//   - quizzes/exams: each question's index maps to its options, so lastAttempt.answers[i] vs
//     questions[i].correctIndex gives a wrong/right per question, rolled up by the note's tags
// A note with no tags contributes to neither signal (nothing to group it by) — this is a
// tags-only view, matching how Notes/History organizes everything else in the app.
const computeWeakTopics = async (userIdRaw) => {
    const userId = new ObjectId(userIdRaw)

    const [flashcardStats, quizNotes, examsAttempted] = await Promise.all([
        Flashcard.aggregate([
            { $match: { user: userId, reviewCount: { $gt: 0 } } },
            { $lookup: { from: 'notes', localField: 'note', foreignField: '_id', as: 'noteDoc' } },
            { $unwind: '$noteDoc' },
            { $unwind: '$noteDoc.tags' },
            { $group: { _id: '$noteDoc.tags', avgEase: { $avg: '$easeFactor' }, reviewedCards: { $sum: 1 } } },
        ]),
        Quiz.find({ user: userId, 'lastAttempt.answers': { $exists: true, $ne: [] } })
            .populate('note', 'tags')
            .select('questions lastAttempt note'),
        Exam.find({ user: userId, 'attempts.0': { $exists: true } })
            .populate('questions.note', 'tags')
            .select('questions attempts'),
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

    for (const exam of examsAttempted) {
        const lastAttempt = exam.attempts[exam.attempts.length - 1]
        exam.questions.forEach((q, i) => {
            const tags = q.note?.tags || []
            if (tags.length === 0) return
            const answered = lastAttempt.answers[i]
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

    // one 0-1 "difficulty" score per tag sir, combining whichever signals are present — ease
    // is inverted and normalized against the 1.3-2.5 SM-2 range so both signals sit on the
    // same scale before averaging. A tag with only one signal just uses that one.
    return Array.from(tagMap.values())
        .map((row) => {
            const easeScore = row.avgEase !== null ? Math.min(1, Math.max(0, (2.5 - row.avgEase) / (2.5 - 1.3))) : null
            const scores = [easeScore, row.wrongRate].filter((s) => s !== null)
            const difficulty = scores.reduce((a, b) => a + b, 0) / scores.length
            return { ...row, difficulty }
        })
        .filter((row) => row.difficulty > 0)
        .sort((a, b) => b.difficulty - a.difficulty)
        .slice(0, 10)
}

module.exports = { computeWeakTopics }
