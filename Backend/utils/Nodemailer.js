const nodemailer = require('nodemailer')

// sends one email sir — used by OTP, password reset, and account deletion notices
const mailSender = async (email, title, body) => {
    try {
        // no SMTP configured sir — skip sending instead of crashing the caller
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.log(`Mail not configured — would have sent "${title}" to ${email}`)
            return null
        }

        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        })

        const info = await transporter.sendMail({
            from: `"AI Notes Summarizer" <${process.env.MAIL_USER}>`,
            to: email,
            subject: title,
            html: body,
        })

        return info
    } catch (error) {
        console.log('mailSender error:', error.message)
        throw error
    }
}

module.exports = mailSender
