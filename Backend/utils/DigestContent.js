const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')

// last 7 days sir — same idea as Analytics.js getMyAnalytics, but a tighter window
// tailored for a weekly email rather than the 30-day dashboard chart
const getWeeklyDigestData = async (userId) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [notesThisWeek, chatsThisWeek, dueFlashcards, quizzesTaken] = await Promise.all([
        Note.countDocuments({ user: userId, createdAt: { $gte: since } }),
        Chat.countDocuments({ user: userId, createdAt: { $gte: since } }),
        Flashcard.countDocuments({ user: userId, dueDate: { $lte: new Date() } }),
        Quiz.countDocuments({ user: userId, 'lastAttempt.total': { $gt: 0 }, updatedAt: { $gte: since } }),
    ])

    return { notesThisWeek, chatsThisWeek, dueFlashcards, quizzesTaken }
}

module.exports = { getWeeklyDigestData }
