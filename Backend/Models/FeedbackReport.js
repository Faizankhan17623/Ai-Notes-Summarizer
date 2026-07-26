const mongoose = require('mongoose')

// bug reports AND feature suggestions share one collection sir, split by `type` — the two
// forms want nearly identical fields (title, description, route, screenshot, status/reply
// workflow), so this mirrors ContactMessage.js's shape closely rather than building two
// near-duplicate models/controllers/admin pages
const feedbackReportSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['bug', 'feature'],
            required: true,
        },
        // the submitter sir — always a logged-in user (see Middlewares/Auth.js on the route),
        // unlike ContactMessage which is a public pre-account form
        submittedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 3000,
        },
        // the page the bug happened on / the suggestion relates to sir — captured client-side
        // via useLocation().pathname at submit time (see Frontend's ScrollToTop.jsx for the
        // existing pattern this piggybacks on), not required since a feature suggestion may
        // not be tied to any specific page
        route: {
            type: String,
            trim: true,
            maxlength: 200,
        },
        // Cloudinary result sir — url is what's actually rendered; publicId kept so a future
        // "delete this report" action can also clean up the Cloudinary asset instead of
        // orphaning it. Both null when no screenshot was attached, or Cloudinary wasn't
        // configured yet at submit time (see utils/Cloudinary.js's isConfigured)
        screenshotUrl: {
            type: String,
            default: null,
        },
        screenshotPublicId: {
            type: String,
            default: null,
        },
        // same lightweight open/resolved workflow as ContactMessage sir — reply and resolve
        // are the same action (see controllers/Feedback.js)
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

feedbackReportSchema.index({ createdAt: -1 })
feedbackReportSchema.index({ type: 1, status: 1 })

module.exports = mongoose.model('FeedbackReport', feedbackReportSchema)
