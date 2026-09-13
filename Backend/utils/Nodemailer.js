const nodemailer = require('nodemailer')
const dns = require('dns')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// one attempt at the relay call sir — split out so sendViaRelay below can retry it
const callRelay = async (email, title, body) => {
    const response = await fetch(process.env.MAIL_RELAY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-relay-secret': process.env.MAIL_RELAY_SECRET,
        },
        body: JSON.stringify({ to: email, subject: title, html: body }),
        signal: AbortSignal.timeout(20000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || !data.success) {
        throw new Error(`Mail relay failed with status ${response.status}`)
    }
    return data
}

// retries a transient relay hiccup sir — a cold-starting Vercel function or a momentary
// network blip shouldn't silently drop a password-reset/OTP email for the whole outage
// window (that was the old behavior: one failed fetch = one failed send, no retry at all).
// 2 short-backoff retries (1s, then 2s) bound the extra latency any single caller sees to a
// few seconds worst case, while still recovering from the common transient case. A real,
// sustained relay outage still surfaces as an error to the caller exactly as before — this
// isn't a fix for "the relay is down," just for "the relay hiccuped once."
const RELAY_RETRY_DELAYS_MS = [1000, 2000]

const sendViaRelay = async (email, title, body) => {
    let lastErr
    for (let attempt = 0; attempt <= RELAY_RETRY_DELAYS_MS.length; attempt++) {
        try {
            return await callRelay(email, title, body)
        } catch (err) {
            lastErr = err
            if (attempt < RELAY_RETRY_DELAYS_MS.length) {
                console.log(`Mail relay attempt ${attempt + 1} failed, retrying:`, err.message)
                await sleep(RELAY_RETRY_DELAYS_MS[attempt])
            }
        }
    }
    throw lastErr
}

// sends one email sir — used by OTP, password reset, and account deletion notices
const mailSender = async (email, title, body) => {
    try {
        // Render's free tier blocks every outbound SMTP port sir — when the relay is
        // configured, hand the email to our Vercel function (port 465 is open there)
        // and let the direct SMTP code below serve as the local-dev fallback
        if (process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET) {
            return await sendViaRelay(email, title, body)
        }

        // no SMTP configured sir — skip sending instead of crashing the caller
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.log(`Mail not configured — would have sent "${title}" to ${email}`)
            return null
        }

        // Render has no outbound IPv6 route sir — the `family: 4` transport option doesn't
        // reliably stop Nodemailer's socket layer from picking an IPv6 result, so resolve to
        // an IPv4 address ourselves and connect to that directly instead
        const { address: ipv4Host } = await dns.promises.lookup(process.env.MAIL_HOST, { family: 4 })

        const transporter = nodemailer.createTransport({
            host: ipv4Host,
            port: 465,
            secure: true,
            tls: {
                servername: process.env.MAIL_HOST, // keep TLS cert validation matching the real hostname
            },
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
