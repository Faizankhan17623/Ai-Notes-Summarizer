const mongoose = require('mongoose')

// one row per in-app notification sir — pushed live over SSE the instant it's created
// (see utils/NotificationHub.js + GET /notifications/stream), with the frontend's ~90s poll
// kept underneath as a fallback since Render's free tier can restart the process mid-connection.
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
