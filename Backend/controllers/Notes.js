const crypto = require('crypto')
const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const User = require('../Models/User')

// GET /notes — the history list sir, rawText left out to keep the payload light
// supports ?search=, ?tag=, ?folder=, ?pinned=true as optional filters
exports.getNotes = async (req, res) => {
    try {
        const id = req.User.id
        const { search, tag, folder, pinned, favorite } = req.query

        const filter = { user: id }
        if (tag) filter.tags = tag
        if (folder) filter.folder = folder
        if (pinned === 'true') filter.pinned = true
        if (favorite === 'true') filter.favorite = true

        // full-text search sir — hits the { title, rawText } text index on Note,
        // which also matches the source content behind the summary, not just the title
        if (search && search.trim()) {
            filter.$text = { $search: search.trim() }
        }

        let query = Note.find(filter).select('title sourceType plan tags folder pinned favorite createdAt updatedAt')

        // text-search results are most useful sorted by relevance sir, otherwise pinned-then-newest
        if (search && search.trim()) {
            query = query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } })
        } else {
            query = query.sort({ pinned: -1, createdAt: -1 })
        }

        const notes = await query

        return res.status(200).json({
            success: true,
            notes
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting your notes',
        })
    }
}

// GET /notes/tags — every distinct tag the user has used sir, powers the filter dropdown
exports.getTags = async (req, res) => {
    try {
        const id = req.User.id
        const tags = await Note.distinct('tags', { user: id })
        const folders = await Note.distinct('folder', { user: id, folder: { $ne: null } })
        return res.status(200).json({ success: true, tags, folders })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load tags' })
    }
}

// PATCH /notes/:noteId/organize — set tags/folder/pinned sir, all optional/independent
exports.organizeNote = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params
        const { tags, folder, pinned, favorite } = req.body

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({ success: false, message: 'Invalid note id' })
        }

        const update = {}
        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                return res.status(400).json({ success: false, message: 'Tags must be an array of strings' })
            }
            update.tags = tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
        }
        if (folder !== undefined) update.folder = folder ? String(folder).trim().slice(0, 60) : null
        if (pinned !== undefined) update.pinned = Boolean(pinned)
        if (favorite !== undefined) update.favorite = Boolean(favorite)

        const note = await Note.findOneAndUpdate({ _id: noteId, user: id }, update, { new: true })
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        return res.status(200).json({ success: true, note })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to update the note' })
    }
}

// POST /notes/:noteId/share — turn on a public read-only link sir, generates a fresh shareId if none exists yet
exports.enableShare = async (req, res) => {
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

        if (!note.shareId) {
            note.shareId = crypto.randomBytes(12).toString('hex')
        }
        note.shareEnabled = true
        await note.save()

        return res.status(200).json({ success: true, shareId: note.shareId })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to enable sharing' })
    }
}

// DELETE /notes/:noteId/share — turn sharing off sir. shareId is kept (not wiped) so re-enabling
// gives back the SAME link — deliberate: rotating the link is a separate "regenerate" action we don't expose yet
exports.disableShare = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({ success: false, message: 'Invalid note id' })
        }

        const note = await Note.findOneAndUpdate({ _id: noteId, user: id }, { shareEnabled: false }, { new: true })
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        return res.status(200).json({ success: true, message: 'Sharing disabled' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to disable sharing' })
    }
}

// GET /shared/:shareId — PUBLIC, no auth sir. Summary only — never rawText, flashcards, or quiz,
// since the raw source text and study material can contain more sensitive/personal content than the summary
exports.getSharedNote = async (req, res) => {
    try {
        const { shareId } = req.params

        const note = await Note.findOne({ shareId, shareEnabled: true }).select('title summary plan createdAt')
        if (!note) {
            return res.status(404).json({ success: false, message: 'This share link is invalid or has been disabled' })
        }

        return res.status(200).json({ success: true, note })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load the shared note' })
    }
}

// GET /notes/:noteId — the full note + summary sir
exports.getNote = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid note id',
            })
        }

        const note = await Note.findOne({ _id: noteId, user: id })
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found',
            })
        }

        return res.status(200).json({
            success: true,
            note
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the note',
        })
    }
}

// DELETE /notes/:noteId — remove a note and any chats grounded in it sir
exports.deleteNote = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid note id',
            })
        }

        const note = await Note.findOneAndDelete({ _id: noteId, user: id })
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found',
            })
        }

        // a note's chats/flashcards/quizzes are meaningless without it sir, clean them all up too
        const orphanedChats = await Chat.find({ note: note._id }).select('_id')
        await Promise.all([
            Chat.deleteMany({ note: note._id }),
            Flashcard.deleteMany({ note: note._id }),
            Quiz.deleteMany({ note: note._id }),
        ])
        await User.findByIdAndUpdate(id, {
            $pull: {
                Notes: note._id,
                Chats: { $in: orphanedChats.map((c) => c._id) }
            }
        })

        return res.status(200).json({
            success: true,
            message: 'Note deleted successfully',
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the note',
        })
    }
}
