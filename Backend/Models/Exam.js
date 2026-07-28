const mongoose = require('mongoose')

// practice exam mode sir — like Quiz.js but spans MULTIPLE notes and is timed, with a full
// attempt history (Quiz keeps only the latest attempt; here every retake is kept so score-
// over-time is visible). Each question carries the source note it was drawn from so scoring
// can roll up per-note-tag into the existing weak-topics signal, same idea as quiz questions do.
const examSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        // every note this exam draws from sir — needed to re-derive tags for weak-topics
        // and so the UI can show "drawn from: X, Y, Z"
        notes: {
            type: [{ type: mongoose.Schema.ObjectId, ref: 'Note' }],
            required: true,
        },
        // seconds allotted for the whole exam sir — null means untimed
        timeLimitSeconds: {
            type: Number,
            default: null,
        },
        questions: [
            {
                question: { type: String, required: true },
                options: { type: [String], required: true },
                correctIndex: { type: Number, required: true },
                explanation: { type: String },
                // which entry in `notes` above this question was drawn from sir
                note: { type: mongoose.Schema.ObjectId, ref: 'Note', required: true },
            }
        ],
        attempts: [
            {
                score: { type: Number, required: true },
                total: { type: Number, required: true },
                answers: { type: [Number], required: true },
                // wall-clock seconds actually spent sir — separate from timeLimitSeconds
                // (the cap offered), this is what was actually used
                durationSeconds: { type: Number },
                attemptedAt: { type: Date, default: Date.now },
            }
        ],
    },
    { timestamps: true }
)

examSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Exam', examSchema)
