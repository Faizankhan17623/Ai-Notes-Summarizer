const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')

// GET /search?q=... sir — one aggregating endpoint across Notes/Chats/Flashcards/Quizzes
// instead of four separate search bars, so "find that one thing" works regardless of which
// feature it lives in. Each collection is capped at 10 and sorted by textScore, same
// relevance-first approach getNotes already uses for its own search.
exports.searchAll = async (req, res) => {
    try {
        const { q } = req.query
        const query = q?.trim()

        if (!query) {
            return res.status(200).json({ success: true, results: { notes: [], chats: [], flashcards: [], quizzes: [] } })
        }

        const id = req.User.id
        const textFilter = { $text: { $search: query } }
        const scoreProjection = { score: { $meta: 'textScore' } }
        const scoreSort = { score: { $meta: 'textScore' } }

        const [notes, chats, flashcards, quizzes] = await Promise.all([
            Note.find({ user: id, ...textFilter })
                .select('title sourceType createdAt')
                .select(scoreProjection)
                .sort(scoreSort)
                .limit(10),
            Chat.find({ user: id, ...textFilter })
                .select('title note createdAt')
                .select(scoreProjection)
                .sort(scoreSort)
                .limit(10),
            Flashcard.find({ user: id, ...textFilter })
                .select('front back note createdAt')
                .select(scoreProjection)
                .sort(scoreSort)
                .limit(10),
            Quiz.find({ user: id, ...textFilter })
                .select('questions note createdAt')
                .select(scoreProjection)
                .sort(scoreSort)
                .limit(10),
        ])

        // quizzes don't have a single "title" sir — surface the first matching question as
        // the result's headline instead of the whole questions array
        const quizResults = quizzes.map((quiz) => ({
            _id: quiz._id,
            note: quiz.note,
            createdAt: quiz.createdAt,
            preview: quiz.questions[0]?.question || 'Quiz',
        }))

        return res.status(200).json({
            success: true,
            results: { notes, chats, flashcards, quizzes: quizResults },
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Search failed' })
    }
}
