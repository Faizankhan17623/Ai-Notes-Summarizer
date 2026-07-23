const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const { getUserPlan } = require('../utils/Plans')

// how far back the heatmap/best-time widgets look sir — 12 months covers a full GitHub-style
// contribution calendar without unbounded growth as an account ages
const HEATMAP_WINDOW_MS = 365 * 24 * 60 * 60 * 1000

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

        // study heatmap sir — one activity count per calendar day over the last 12 months,
        // "activity" = notes created + flashcards reviewed + quizzes attempted, the same
        // three actions utils/Streak.js already counts toward the daily streak. Three
        // separate per-day aggregations merged in JS (same "derive from 3 maps" pattern
        // Admin.js's getAdminAnalytics topUsers already uses), since they're 3 different
        // collections/date fields and can't be one Mongo pipeline.
        const heatmapSince = new Date(Date.now() - HEATMAP_WINDOW_MS)
        const [notesByDayFull, reviewsByDay, attemptsByDay] = await Promise.all([
            Note.aggregate([
                { $match: { user: userObjectId, createdAt: { $gte: heatmapSince } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            ]),
            Flashcard.aggregate([
                { $match: { user: userObjectId, lastReviewedAt: { $gte: heatmapSince } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastReviewedAt' } }, count: { $sum: 1 } } },
            ]),
            Quiz.aggregate([
                { $match: { user: userObjectId, 'lastAttempt.attemptedAt': { $gte: heatmapSince } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastAttempt.attemptedAt' } }, count: { $sum: 1 } } },
            ]),
        ])
        const heatmapMap = new Map()
        const addToHeatmap = (rows) => rows.forEach((row) => heatmapMap.set(row._id, (heatmapMap.get(row._id) || 0) + row.count))
        addToHeatmap(notesByDayFull)
        addToHeatmap(reviewsByDay)
        addToHeatmap(attemptsByDay)
        const heatmap = Array.from(heatmapMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))

        // best time to study sir — activity VOLUME by hour-of-day and day-of-week, not
        // accuracy: Flashcard only stores a single lastReviewedAt + current ease per card,
        // never a history of every past review's rating, so "accuracy at 9pm" was simply
        // never recorded and can't be reconstructed. This instead answers "when do I
        // actually show up to study" — a real, honest signal from data that does exist.
        // $dayOfWeek is 1=Sunday..7=Saturday in Mongo's convention.
        const [reviewsByHour, reviewsByDow] = await Promise.all([
            Flashcard.aggregate([
                { $match: { user: userObjectId, lastReviewedAt: { $ne: null } } },
                { $group: { _id: { $hour: '$lastReviewedAt' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Flashcard.aggregate([
                { $match: { user: userObjectId, lastReviewedAt: { $ne: null } } },
                { $group: { _id: { $dayOfWeek: '$lastReviewedAt' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
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
                heatmap,
                bestTime: { byHour: reviewsByHour, byDayOfWeek: reviewsByDow },
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
