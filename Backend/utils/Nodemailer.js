const nodemailer = require('nodemailer')

// Render's free tier blocks outbound SMTP entirely, so in production we send over
// Brevo's HTTPS API instead sir — SMTP below stays as the local-dev fallback
const sendViaBrevo = async (email, title, body) => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sender: { name: 'Notewise', email: process.env.MAIL_USER },
            to: [{ email }],
            subject: title,
            htmlContent: body,
        }),
    })

    if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Brevo API ${response.status}: ${detail}`)
    }

    return response.json()
}

// sends one email sir — used by OTP, password reset, and account deletion notices
const mailSender = async (email, title, body) => {
    try {
        if (process.env.BREVO_API_KEY) {
            return await sendViaBrevo(email, title, body)
        }

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
            // without these, a network-level failure to reach MAIL_HOST (blocked port,
            // wrong host, dead SMTP server) hangs the request forever instead of erroring sir
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
        })

        const info = await transporter.sendMail({
            from: `"Notewise" <${process.env.MAIL_USER}>`,
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
