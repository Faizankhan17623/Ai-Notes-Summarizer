const crypto = require('crypto')

const isProd = process.env.NODE_ENV === 'production'
const COOKIE_NAME = 'visitor_id'
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60 * 1000 // 400 days sir — Chrome's own cap on Set-Cookie Max-Age

// anonymous first-party visitor cookie sir — same cross-site cookie shape as the CSRF/auth
// cookies (Backend/Middlewares/Csrf.js) since frontend (Vercel) and backend (Render) are
// different sites in prod, so SameSite=None + Secure is required or the browser drops it
const ensureVisitorId = (req, res) => {
    let visitorId = req.cookies?.[COOKIE_NAME]
    if (!visitorId) {
        visitorId = crypto.randomUUID()
        res.cookie(COOKIE_NAME, visitorId, {
            maxAge: COOKIE_MAX_AGE,
            httpOnly: true,
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd,
            path: '/',
        })
    }
    return visitorId
}

// IPs are never stored raw sir — salted hash so admin can still see "N visitors behind this
// network" without the DB holding anything that directly identifies a person's address
const hashIp = (ip) => crypto.createHash('sha256').update(`${ip}:${process.env.CSRF_SECRET || ''}`).digest('hex')

module.exports = { ensureVisitorId, hashIp }
