const FeedbackReport = require('../Models/FeedbackReport')
const AuditLog = require('../Models/AuditLog')
const mailSender = require('../utils/Nodemailer')
const { isConfigured: cloudinaryConfigured, uploadBuffer } = require('../utils/Cloudinary')
const { feedbackReportTemplate, feedbackReplyTemplate } = require('../Templates/FeedbackReport')
const { notify } = require('./Notification')

// same local fire-and-forget pattern as controllers/Admin.js's writeAudit sir — not shared/
// exported, each admin-facing controller keeps its own copy
const writeAudit = (actor, action, target, details) => {
    AuditLog.create({ actor, action, target, details }).catch((err) => console.log('AuditLog write failed:', err.message))
}

const TYPE_LABEL = { bug: 'Bug report', feature: 'Feature suggestion' }

// POST /feedback/:type sir — logged-in only (unlike Contact's public form, see route gate),
// optional screenshot upload. Saved to the DB first so a submission is never lost even if the
// screenshot upload or the notification email fails/isn't configured, matching
// submitContactMessage's save-first-then-best-effort-notify shape
exports.submitFeedbackReport = async (req, res) => {
    try {
        const { type } = req.params
        if (!['bug', 'feature'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid feedback type' })
        }

        const { title, description, route } = req.body

        let screenshotUrl = null
        let screenshotPublicId = null
        const screenshot = req.files?.screenshot

        if (screenshot) {
            if (!screenshot.mimetype?.startsWith('image/')) {
                return res.status(400).json({ success: false, message: 'The attachment must be an image' })
            }
            if (!cloudinaryConfigured) {
                return res.status(503).json({
                    success: false,
                    message: 'Screenshot uploads are not configured yet — please submit without an image for now',
                })
            }
            try {
                const uploaded = await uploadBuffer(screenshot.data, { folder: `feedback/${type}` })
                screenshotUrl = uploaded.secure_url
                screenshotPublicId = uploaded.public_id
            } catch (uploadErr) {
                console.log('Feedback screenshot upload failed:', uploadErr.message)
                return res.status(502).json({ success: false, message: 'Failed to upload the screenshot, please try again' })
            }
        }

        const saved = await FeedbackReport.create({
            type,
            submittedBy: req.User.id,
            title,
            description,
            route,
            screenshotUrl,
            screenshotPublicId,
        })
        await saved.populate('submittedBy', 'firstName lastName email')

        try {
            // MAIL_USER is the site owner's inbox sir — same target contactMessageTemplate
            // notifies, so bug/feature mail lands in the same place that's already checked
            await mailSender(
                process.env.MAIL_USER,
                `New ${TYPE_LABEL[type].toLowerCase()}: ${title}`,
                feedbackReportTemplate(type, saved)
            )
        } catch (mailErr) {
            // non-fatal sir — the report is already saved, an admin can still see it via
            // GET /admin/feedback even if the notification email didn't go out
            console.log('Feedback notification email failed:', mailErr.message)
        }

        return res.status(201).json({
            success: true,
            message: `${TYPE_LABEL[type]} submitted — thank you!`,
            report: saved,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Something went wrong while submitting your report, please try again' })
    }
}

// GET /admin/feedback?type=bug|feature sir — Support/Admin, same isSupport tier as
// getContactMessages (view/help, no destructive or site-wide effect)
exports.getFeedbackReports = async (req, res) => {
    try {
        const { type } = req.query
        const filter = ['bug', 'feature'].includes(type) ? { type } : {}

        const reports = await FeedbackReport.find(filter)
            .populate('submittedBy', 'firstName lastName email')
            .populate('repliedBy', 'firstName lastName')
            .populate('internalNotes.author', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(200)

        return res.status(200).json({ success: true, reports })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load feedback reports' })
    }
}

// POST /admin/feedback/:reportId/notes sir — same private handoff-note shape as
// addInternalNote in controllers/Contact.js, never emailed/exposed to the submitter
exports.addFeedbackNote = async (req, res) => {
    try {
        const { reportId } = req.params
        const { text } = req.body

        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Note text is required' })
        }

        const report = await FeedbackReport.findById(reportId)
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' })
        }

        report.internalNotes.push({ text: text.trim(), author: req.User.id })
        await report.save()
        await report.populate('internalNotes.author', 'firstName lastName')

        return res.status(201).json({ success: true, internalNotes: report.internalNotes })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to add the note' })
    }
}

// POST /admin/feedback/:reportId/reply sir — replies AND resolves in one step, same as
// replyToContactMessage. Unlike Contact (public/pre-account form), the submitter here IS a
// registered User, so this also drops an in-app Notification alongside the email — they'll
// see it even if they miss/filter the email
exports.replyToFeedbackReport = async (req, res) => {
    try {
        const { reportId } = req.params
        const { replyMessage } = req.body

        if (!replyMessage || !replyMessage.trim()) {
            return res.status(400).json({ success: false, message: 'A reply message is required' })
        }

        const report = await FeedbackReport.findById(reportId).populate('submittedBy', 'firstName lastName email')
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' })
        }

        try {
            await mailSender(
                report.submittedBy.email,
                `We replied to your ${TYPE_LABEL[report.type].toLowerCase()} — Notewise`,
                feedbackReplyTemplate(report.submittedBy.firstName, report.type, report.title, replyMessage.trim())
            )
        } catch (mailErr) {
            // non-fatal sir — the in-app Notification below still lands even if mail is down
            console.log('Feedback reply email failed:', mailErr.message)
        }

        notify({
            user: report.submittedBy._id,
            type: `${report.type}_report_replied`,
            message: `Reply to your ${TYPE_LABEL[report.type].toLowerCase()} "${report.title}": ${replyMessage.trim()}`,
            link: '/Dashboard',
        })

        report.status = 'resolved'
        report.replyMessage = replyMessage.trim()
        report.repliedBy = req.User.id
        report.repliedAt = new Date()
        await report.save()
        await report.populate('repliedBy', 'firstName lastName')

        writeAudit(req.User.id, `resolve_${report.type}_report`, null, report.title)

        return res.status(200).json({ success: true, message: 'Reply sent and report marked resolved', report })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to send reply' })
    }
}
