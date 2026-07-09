const mongoose = require('mongoose')

// one row per admin action sir — ban, promote, delete, announcement changes etc.
const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        target: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        details: {
            type: String,
        },
    },
    { timestamps: true }
)

auditLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
