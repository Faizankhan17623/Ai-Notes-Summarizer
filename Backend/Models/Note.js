const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema(
    {
        // the owner of this note sir — every query must filter by this
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // shown in the history list sir — first line/60 chars of the source text
        title: {
            type: String,
            default: 'Untitled Note',
            trim: true,
            maxlength: 80
        },
        // where the raw text came from sir
        sourceType: {
            type: String,
            enum: ['text', 'pdf', 'docx', 'txt', 'voice'],
            required: true
        },
        // the extracted/typed/dictated text that was actually summarized sir
        rawText: {
            type: String,
            required: true
        },
        // which plan generated this summary sir — kept so History can show the tier badge
        plan: {
            type: String,
            enum: ['Basic', 'Pro', 'ProMax'],
            default: 'Basic'
        },
        // the structured JSON the AI returned sir — shape depends on plan, see utils/Prompts.js
        summary: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        // organization sir — free-form tags the user assigns, e.g. "Work", "Lectures"
        tags: {
            type: [String],
            default: []
        },
        // a single folder per note sir — simpler than nested folders, matches most notes-app UX
        folder: {
            type: String,
            trim: true,
            maxlength: 60,
            default: null
        },
        pinned: {
            type: Boolean,
            default: false
        },
        // set only when shareViaLink is turned on sir — a random unguessable id, not the note's own _id,
        // so the share link can be revoked/rotated without touching the note itself
        shareId: {
            type: String,
            default: null,
            index: true,
            sparse: true
        },
        shareEnabled: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

noteSchema.index({ user: 1, createdAt: -1 })
noteSchema.index({ user: 1, pinned: -1, createdAt: -1 })
noteSchema.index({ user: 1, folder: 1 })
// full-text search across title + summary + the raw source text sir
noteSchema.index({ title: 'text', rawText: 'text' })

module.exports = mongoose.model('Note', noteSchema)
