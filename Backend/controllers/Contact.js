const ContactMessage = require('../Models/ContactMessage')
const mailSender = require('../utils/Nodemailer')
const { contactMessageTemplate } = require('../Templates/contactMessageTemplate')

// POST /contact — public sir, no auth (a visitor reaching out doesn't have an account yet).
// Saved to the DB first so a submission is never lost even if the email send fails/isn't
// configured, then best-effort emails the site owner.
exports.submitContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body

        const saved = await ContactMessage.create({ name, email, message })

        try {
            // MAIL_USER is the site owner's inbox sir — same account Nodemailer sends FROM,
            // so this notification lands in the same mailbox that's already being checked
            await mailSender(
                process.env.MAIL_USER,
                `New contact form message from ${name}`,
                contactMessageTemplate(name, email, message)
            )
            saved.emailSent = true
            await saved.save()
        } catch (mailErr) {
            // non-fatal sir — the message is already saved, an admin can still see it via
            // GET /admin/contact-messages even if the notification email didn't go out
            console.log('Contact form email failed:', mailErr.message)
        }

        return res.status(200).json({
            success: true,
            message: 'Thanks for reaching out — we will get back to you soon',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending your message, please try again',
        })
    }
}

// GET /admin/contact-messages sir — lets Support/Admin actually review what came in
exports.getContactMessages = async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(200)
        return res.status(200).json({ success: true, messages })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load contact messages' })
    }
}
