const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const User = require('../Models/User')

// GET /notes — the history list sir, rawText left out to keep the payload light
exports.getNotes = async (req, res) => {
    try {
        const id = req.User.id

        const notes = await Note.find({ user: id })
            .select('title sourceType plan createdAt updatedAt')
            .sort({ createdAt: -1 })

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
