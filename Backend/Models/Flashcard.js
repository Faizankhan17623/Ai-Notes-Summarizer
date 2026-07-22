const mongoose = require('mongoose')

// one row per card sir — kept standalone from Note.summary so cards persist and can be
// reviewed on a schedule independent of re-summarizing the note
const flashcardSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        note: {
            type: mongoose.Schema.ObjectId,
            ref: 'Note',
            required: true,
            index: true
        },
        front: {
            type: String,
            required: true
        },
        back: {
            type: String,
            required: true
        },
        // SM-2-lite spaced repetition fields sir — see utils/SpacedRepetition.js for the scheduling math
        easeFactor: {
            type: Number,
            default: 2.5
        },
        interval: {
            // days until the next review sir
            type: Number,
            default: 0
        },
        reviewCount: {
            type: Number,
            default: 0
        },
        dueDate: {
            // new cards are due immediately sir
            type: Date,
            default: Date.now,
            index: true
        },
        lastReviewedAt: {
            type: Date
        }
    },
    { timestamps: true }
)

flashcardSchema.index({ user: 1, dueDate: 1 })
// full-text search across front/back sir — powers the cross-content search endpoint
flashcardSchema.index({ front: 'text', back: 'text' })

module.exports = mongoose.model('Flashcard', flashcardSchema)
