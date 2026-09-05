const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema(
    {
        // the owner of this chat sir — every query must filter by this
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // the note this chat is grounded in sir — the AI only ever talks about this note's
        // content. Left in place (rather than folded into `notes` below) so every EXISTING
        // single-note chat keeps working unchanged; only required when `notes` is empty.
        note: {
            type: mongoose.Schema.ObjectId,
            ref: 'Note',
            required: function () { return this.notes.length === 0 },
            index: true
        },
        // multi-note chat sir — when non-empty, the AI is grounded in ALL of these notes at
        // once instead of just `note` above. `note` stays null for chats created this way.
        notes: {
            type: [{ type: mongoose.Schema.ObjectId, ref: 'Note' }],
            default: []
        },
        // shown in the chat list sidebar sir
        title: {
            type: String,
            default: 'New Chat',
            trim: true,
            maxlength: 80
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ['user', 'assistant'],
                    required: true
                },
                content: {
                    type: String,
                    required: true
                },
                // Snapshots preserve the evidence even after a source note is edited.
                citations: { type: [{
                    _id: false, id: String, note: mongoose.Schema.ObjectId,
                    title: String, excerpt: String, start: Number, end: Number,
                    page: Number, revision: String,
                }], default: [] },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    { timestamps: true }
)

// full-text search across the chat title + every message's content sir — mirrors
// Note.js's { title, rawText } text index, powers the cross-content search endpoint
chatSchema.index({ title: 'text', 'messages.content': 'text' })

module.exports = mongoose.model('Chat', chatSchema)
