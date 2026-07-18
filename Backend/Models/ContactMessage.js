const mongoose = require('mongoose')

// one row per Contact page submission sir — kept in the DB (not just emailed) so an admin
// can review past submissions even if the email notification failed/was missed
const contactMessageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        // true once the notification email to the site owner was sent successfully sir —
        // lets an admin spot submissions that were saved but never actually got emailed
        emailSent: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

contactMessageSchema.index({ createdAt: -1 })

module.exports = mongoose.model('ContactMessage', contactMessageSchema)
