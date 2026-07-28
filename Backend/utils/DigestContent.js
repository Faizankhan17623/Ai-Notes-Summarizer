const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const { computeWeakTopics } = require('./WeakTopics')

// last 7 days sir — same idea as Analytics.js getMyAnalytics, but a tighter window
// tailored for a weekly email rather than the 30-day dashboard chart. weakTopics is NOT
// week-scoped (it's the user's current standing, same signal as GET /study/weak-topics) —
// included here so the AI recap can point at a real struggling topic, not just raw counts.
const getWeeklyDigestData = async (userId) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [notesThisWeek, chatsThisWeek, dueFlashcards, quizzesTaken, weakTopics] = await Promise.all([
        Note.countDocuments({ user: userId, createdAt: { $gte: since } }),
        Chat.countDocuments({ user: userId, createdAt: { $gte: since } }),
        Flashcard.countDocuments({ user: userId, dueDate: { $lte: new Date() } }),
        Quiz.countDocuments({ user: userId, 'lastAttempt.total': { $gt: 0 }, updatedAt: { $gte: since } }),
        computeWeakTopics(userId),
    ])

    return { notesThisWeek, chatsThisWeek, dueFlashcards, quizzesTaken, weakTopics }
}

module.exports = { getWeeklyDigestData }
