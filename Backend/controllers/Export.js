const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const { toMarkdown, toPdf, toDocx, toReviewQueuePdf, toFlashcardDeckPdf, toQuizPdf } = require('../utils/Export')

// GET /notes/:noteId/export/:format sir — format is md | pdf | docx
exports.exportNote = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId, format } = req.params

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({ success: false, message: 'Invalid note id' })
        }

        if (!['md', 'pdf', 'docx'].includes(format)) {
            return res.status(400).json({ success: false, message: 'Format must be md, pdf, or docx' })
        }

        const note = await Note.findOne({ _id: noteId, user: id })
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        // filesystem-safe filename sir — strip anything that isn't a word char/space/dash
        const safeTitle = (note.summary?.title || 'note').replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'note'

        if (format === 'md') {
            const markdown = toMarkdown(note)
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.md"`)
            return res.status(200).send(markdown)
        }

        if (format === 'pdf') {
            const buffer = await toPdf(note)
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`)
            return res.status(200).send(buffer)
        }

        // docx sir
        const buffer = await toDocx(note)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`)
        return res.status(200).send(buffer)
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while exporting the note' })
    }
}

// GET /flashcards/review/export sir — the whole due-flashcard queue as a printable PDF study sheet
exports.exportReviewQueue = async (req, res) => {
    try {
        const id = req.User.id

        const flashcards = await Flashcard.find({ user: id, dueDate: { $lte: new Date() } })
            .populate('note', 'title')
            .sort({ dueDate: 1 })
            .limit(50)

        const buffer = await toReviewQueuePdf(flashcards)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="review-queue.pdf"`)
        return res.status(200).send(buffer)
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while exporting the review queue' })
    }
}

// GET /notes/:noteId/flashcards/export sir — every flashcard for this ONE note as a printable deck,
// regardless of due date (unlike exportReviewQueue above which is cross-note + due-only)
exports.exportFlashcardDeck = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({ success: false, message: 'Invalid note id' })
        }

        const note = await Note.findOne({ _id: noteId, user: id })
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        const flashcards = await Flashcard.find({ note: note._id, user: id }).sort({ createdAt: 1 })
        if (!flashcards.length) {
            return res.status(404).json({ success: false, message: 'This note has no flashcards yet' })
        }

        const safeTitle = (note.summary?.title || note.title || 'deck').replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'deck'
        const buffer = await toFlashcardDeckPdf(note, flashcards)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-flashcards.pdf"`)
        return res.status(200).send(buffer)
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while exporting the flashcard deck' })
    }
}

// GET /quizzes/:quizId/export sir — one quiz as a printable question sheet + answer key
exports.exportQuiz = async (req, res) => {
    try {
        const id = req.User.id
        const { quizId } = req.params

        if (!mongoose.isValidObjectId(quizId)) {
            return res.status(400).json({ success: false, message: 'Invalid quiz id' })
        }

        const quiz = await Quiz.findOne({ _id: quizId, user: id }).populate('note', 'title summary')
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' })
        }

        const safeTitle = (quiz.note?.summary?.title || quiz.note?.title || 'quiz').replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'quiz'
        const buffer = await toQuizPdf(quiz.note, quiz)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-quiz.pdf"`)
        return res.status(200).send(buffer)
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while exporting the quiz' })
    }
}
