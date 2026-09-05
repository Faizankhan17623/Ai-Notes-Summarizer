const mongoose = require('mongoose')
const adaptiveSessionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, enum: ['quiz', 'exam'], required: true },
    source: { type: mongoose.Schema.ObjectId, required: true },
    score: { type: Number, required: true }, total: { type: Number, required: true },
    wrongTopics: { type: [String], default: [] }, cardsCreated: { type: Number, default: 0 },
}, { timestamps: true })
adaptiveSessionSchema.index({ user: 1, createdAt: -1 })
module.exports = mongoose.model('AdaptiveSession', adaptiveSessionSchema)
