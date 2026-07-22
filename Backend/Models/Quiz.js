const mongoose = require('mongoose')

// one quiz per generation sir — a note can have several quizzes over time (e.g. "generate more")
const quizSchema = new mongoose.Schema(
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
        questions: [
            {
                question: { type: String, required: true },
                options: { type: [String], required: true },
                correctIndex: { type: Number, required: true },
                explanation: { type: String }
            }
        ],
        // the user's most recent attempt sir — retaking overwrites this, questions stay the same
        lastAttempt: {
            score: { type: Number },       // number correct
            total: { type: Number },
            answers: { type: [Number] },   // the option index the user picked per question
            attemptedAt: { type: Date }
        }
    },
    { timestamps: true }
)

// full-text search across each question's text + explanation sir — powers the
// cross-content search endpoint
quizSchema.index({ 'questions.question': 'text', 'questions.explanation': 'text' })

module.exports = mongoose.model('Quiz', quizSchema)
