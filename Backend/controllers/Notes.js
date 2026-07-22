const crypto = require('crypto')
const mongoose = require('mongoose')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const User = require('../Models/User')
const { extractText } = require('../utils/Parsers')
const { getEffectivePlan } = require('../utils/Plans')

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

// POST /notes/import sir — creates a Note directly from pasted text or an uploaded file,
// with NO AI call and NO credit/feature-usage spend. This is the entire point of the
// feature: a way to add a note without touching Groq or the plan's usage caps at all.
// Reuses extractText (utils/Parsers.js) for file uploads, same as controllers/AI.js's
// Calling — a .pdf/.docx/.txt import goes through the identical extraction path, just
// skips the summarize step afterward.
exports.importNote = async (req, res) => {
    try {
        const id = req.User.id
        const file = req.files?.notes
        const pastedText = req.body?.text

        let text = ''
        let sourceType = 'import'

        if (file) {
            try {
                const extracted = await extractText(file)
                text = extracted.text
            } catch (parseErr) {
                return res.status(400).json({ success: false, message: parseErr.message })
            }
        } else if (pastedText && pastedText.trim()) {
            text = pastedText.trim()
        }

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please paste some text or upload a file to import',
            })
        }

        // same tier badge as a summarized note would show sir (History page reads note.plan),
        // even though no credit/feature-usage gate was actually checked here
        const user = await User.findById(id).select('SubType SubscriptionExpires')
        const plan = getEffectivePlan(user)

        // title from the first non-empty line sir, same convention as a filename-derived
        // title would read — falls back to the schema default if the text starts blank
        const firstLine = text.split('\n').find((line) => line.trim())?.trim().slice(0, 80)

        const note = await Note.create({
            user: id,
            title: firstLine || 'Imported note',
            sourceType,
            rawText: text,
            plan: plan.key,
            // minimal valid shape sir — Note.summary is schema-required, and Report.jsx
            // already renders keyPoints/sections/keyTerms safely via optional chaining when
            // they're absent, so this doesn't need to fabricate the full AI-summary shape
            summary: { title: firstLine || 'Imported note', tldr: '' },
        })

        return res.status(201).json({ success: true, message: 'Note imported', noteId: note._id })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to import the note' })
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

        const note = await Note.findOneAndUpdate({ _id: noteId, user: id }, update, { returnDocument: 'after' })
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

        const note = await Note.findOneAndUpdate({ _id: noteId, user: id }, { shareEnabled: false }, { returnDocument: 'after' })
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

// GET /notes/:noteId/related — other notes by this user sharing at least one tag sir,
// ranked by overlap count then recency. No AI call — pure tag overlap, keeps this free
exports.getRelatedNotes = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.params

        if (!mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({ success: false, message: 'Invalid note id' })
        }

        const note = await Note.findOne({ _id: noteId, user: id }).select('tags')
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' })
        }

        if (!note.tags.length) {
            return res.status(200).json({ success: true, notes: [] })
        }

        const related = await Note.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(id),
                    _id: { $ne: note._id },
                    tags: { $in: note.tags },
                },
            },
            {
                $addFields: {
                    overlap: { $size: { $setIntersection: ['$tags', note.tags] } },
                },
            },
            { $sort: { overlap: -1, createdAt: -1 } },
            { $limit: 5 },
            { $project: { title: 1, tags: 1, plan: 1, createdAt: 1, overlap: 1 } },
        ])

        return res.status(200).json({ success: true, notes: related })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load related notes' })
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

// DELETE /notes/bulk sir — loops the exact same single-delete logic above per id (not a
// bulk Mongo op) so each note's Chat/Flashcard/Quiz cascade and User.Notes/Chats pull still
// happen correctly; a bad id in the batch is skipped and reported, not a hard failure
exports.bulkDeleteNotes = async (req, res) => {
    try {
        const id = req.User.id
        const { noteIds } = req.body

        const deleted = []
        const failed = []
        for (const noteId of noteIds) {
            try {
                if (!mongoose.isValidObjectId(noteId)) {
                    failed.push({ noteId, message: 'Invalid note id' })
                    continue
                }
                const note = await Note.findOneAndDelete({ _id: noteId, user: id })
                if (!note) {
                    failed.push({ noteId, message: 'Note not found' })
                    continue
                }
                const orphanedChats = await Chat.find({ note: note._id }).select('_id')
                await Promise.all([
                    Chat.deleteMany({ note: note._id }),
                    Flashcard.deleteMany({ note: note._id }),
                    Quiz.deleteMany({ note: note._id }),
                ])
                await User.findByIdAndUpdate(id, {
                    $pull: { Notes: note._id, Chats: { $in: orphanedChats.map((c) => c._id) } }
                })
                deleted.push(noteId)
            } catch {
                failed.push({ noteId, message: 'Failed to delete this note' })
            }
        }

        return res.status(200).json({ success: true, message: `Deleted ${deleted.length} of ${noteIds.length} notes`, deleted, failed })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to run the bulk delete' })
    }
}

// PATCH /notes/bulk-tag sir — $addToSet, not a full tags replace like organizeNote above,
// so bulk-adding one tag never touches a note's other existing tags
exports.bulkAddTag = async (req, res) => {
    try {
        const id = req.User.id
        const { noteIds, tag } = req.body

        const trimmedTag = String(tag).trim().slice(0, 40)
        if (!trimmedTag) {
            return res.status(400).json({ success: false, message: 'Tag cannot be empty' })
        }

        const result = await Note.updateMany(
            { _id: { $in: noteIds }, user: id },
            { $addToSet: { tags: trimmedTag } }
        )

        return res.status(200).json({ success: true, message: `Tagged ${result.modifiedCount} of ${noteIds.length} notes` })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to run the bulk tag update' })
    }
}
