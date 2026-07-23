const mongoose = require('mongoose')

// one row per PAST state of a note sir — written just before an edit overwrites Note itself
// (see controllers/Notes.js editNote), never on metadata-only changes like organizeNote's
// tags/folder/pin/favorite. Only content fields are snapshotted; title/summary/rawText are
// exactly what a "version" of a note's content means here.
const noteVersionSchema = new mongoose.Schema(
    {
        note: {
            type: mongoose.Schema.ObjectId,
            ref: 'Note',
            required: true,
            index: true,
        },
        // denormalized sir — a version must still resolve to its owner even if this row is
        // ever queried on its own, and it saves a populate() on the common "list my note's
        // versions" path
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        rawText: {
            type: String,
            required: true,
        },
        summary: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    { timestamps: true }
)

noteVersionSchema.index({ note: 1, createdAt: -1 })

module.exports = mongoose.model('NoteVersion', noteVersionSchema)
