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
        }
    },
    { timestamps: true }
)

noteSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Note', noteSchema)
