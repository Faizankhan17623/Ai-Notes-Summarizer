const mongoose = require('mongoose')

// one task inside a generated plan sir — points at whichever source it came from (a note to
// re-read, a due flashcard set, a quiz) so the frontend can deep-link straight to it
const planItemSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['review_note', 'flashcards', 'quiz', 'new_summary'],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 300,
        },
        note: {
            type: mongoose.Schema.ObjectId,
            ref: 'Note',
            default: null,
        },
        estimatedMinutes: {
            type: Number,
            default: 10,
        },
        done: {
            type: Boolean,
            default: false,
        },
    },
    { _id: true }
)

// one plan per user per calendar day sir — generated on demand (or lazily reused if today's
// plan already exists), never silently regenerated once the user has started checking items off
const studyPlanSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // YYYY-MM-DD sir — same UTC day-key convention as utils/Streak.js, so "today's plan"
        // is a simple equality lookup instead of a date-range query
        dayKey: {
            type: String,
            required: true,
        },
        items: {
            type: [planItemSchema],
            default: [],
        },
        // the best study hour (0-23) this plan was generated for sir, from the analytics
        // bestTime signal — null if the user doesn't have enough history yet
        suggestedHour: {
            type: Number,
            default: null,
        },
    },
    { timestamps: true }
)

studyPlanSchema.index({ user: 1, dayKey: 1 }, { unique: true })

module.exports = mongoose.model('StudyPlan', studyPlanSchema)
