const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Flashcard = require('../Models/Flashcard')
const { toMarkdown, toPdf, toDocx, toReviewQueuePdf } = require('../utils/Export')

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
