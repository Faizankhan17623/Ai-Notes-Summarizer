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
        // Support's ticket workflow sir — a submission starts 'open', becomes 'resolved' the
        // moment someone replies (see controllers/Contact.js replyToContactMessage). No
        // separate "in progress" state — replying and resolving are the same action here,
        // keeping this a lightweight ticket system rather than a full helpdesk
        status: {
            type: String,
            enum: ['open', 'resolved'],
            default: 'open',
        },
        replyMessage: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        repliedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        repliedAt: {
            type: Date,
        },
        // private handoff notes sir — visible to Support/Admin only (never sent to the
        // submitter, never exposed on any public endpoint), for context like "called them,
        // waiting on a screenshot" between support agents working the same ticket
        internalNotes: [{
            text: {
                type: String,
                required: true,
                trim: true,
                maxlength: 1000,
            },
            author: {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    { timestamps: true }
)

contactMessageSchema.index({ createdAt: -1 })

module.exports = mongoose.model('ContactMessage', contactMessageSchema)
