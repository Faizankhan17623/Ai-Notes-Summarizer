const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const { getUserPlan } = require('../utils/Plans')

// GET /analytics/me — everything the dashboard's usage chart needs sir, all scoped to the logged-in user
exports.getMyAnalytics = async (req, res) => {
    try {
        const id = req.User.id
        // aggregate() does NOT auto-cast strings to ObjectIds the way find() does sir —
        // req.User.id is a plain string straight from the JWT payload, so $match needs an explicit cast
        const userObjectId = new mongoose.Types.ObjectId(id)

        // notes created per day over the last 30 days sir — used for the activity chart
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const notesByDay = await Note.aggregate([
            { $match: { user: userObjectId, createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])

        const [noteCount, chatCount, flashcardCount, quizzes, plan] = await Promise.all([
            Note.countDocuments({ user: id }),
            Chat.countDocuments({ user: id }),
            Flashcard.countDocuments({ user: id }),
            Quiz.find({ user: id }).select('lastAttempt.score lastAttempt.total'),
            getUserPlan(id),
        ])

        // cards already reviewed at least once vs never touched sir — a simple mastery signal
        const cardsReviewed = await Flashcard.countDocuments({ user: id, reviewCount: { $gt: 0 } })

        const attempted = quizzes.filter((q) => q.lastAttempt?.total)
        const avgQuizScore = attempted.length
            ? Math.round((attempted.reduce((sum, q) => sum + q.lastAttempt.score / q.lastAttempt.total, 0) / attempted.length) * 100)
            : null

        return res.status(200).json({
            success: true,
            analytics: {
                notesByDay,
                noteCount,
                chatCount,
                flashcardCount,
                cardsReviewed,
                quizzesTaken: attempted.length,
                avgQuizScore,
                plan: {
                    key: plan.key,
                    creditsLimit: plan.credits, // creditsUsed is already surfaced by GET /profile, not duplicated here
                }
            }
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load your analytics' })
    }
}
