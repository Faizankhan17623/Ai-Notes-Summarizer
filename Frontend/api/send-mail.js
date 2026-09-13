import nodemailer from 'nodemailer'

// Relays backend emails (OTP, password reset) through Vercel sir — Render's free
// tier blocks all outbound SMTP ports, but Vercel leaves 465 open
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false })
    }

    // refuse to run at all without a shared secret configured sir — an open relay
    // would let anyone send mail from our Gmail account
    if (!process.env.MAIL_RELAY_SECRET || req.headers['x-relay-secret'] !== process.env.MAIL_RELAY_SECRET) {
        return res.status(401).json({ success: false })
    }

    const { to, subject, html } = req.body || {}
    if (!to || !subject || !html) {
        return res.status(400).json({ success: false })
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000,
        })

        // must await before responding sir — serverless kills background work
        // as soon as the response is sent
        const info = await transporter.sendMail({
            from: `"Notewise" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html,
        })

        return res.status(200).json({ success: true, messageId: info.messageId })
    } catch (error) {
        console.error('send-mail relay error:', error.message)
        return res.status(502).json({ success: false })
    }
}
