const mongoose = require('mongoose')

// one row per in-app notification sir — polled by the frontend (GET /notifications every
// ~30s), not pushed. No socket/SSE layer: this app runs on Render's free tier, which sleeps
// and restarts the process, so a persistent connection would just add complexity for a use
// case (credits low, plan expiring, support replied) that never needed sub-second delivery.
const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // free-form category sir — lets the frontend pick an icon/tone without a fixed enum
        // blocking new notification types later (e.g. 'credits_low', 'plan_expiring', 'contact_reply')
        type: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        // optional deep link sir — e.g. /Dashboard/Note/:id, so clicking a notification can
        // navigate straight to what it's about instead of just dismissing it
        link: {
            type: String,
            default: null,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

notificationSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
