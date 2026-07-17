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
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            // Render has no outbound IPv6 route sir — without this, Node resolves Gmail's SMTP
            // host to an IPv6 address and the connection dies with ENETUNREACH
            family: 4,
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
