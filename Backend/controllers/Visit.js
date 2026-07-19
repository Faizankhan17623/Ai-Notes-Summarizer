const jwt = require('jsonwebtoken')
const Visit = require('../Models/Visit')
const { ensureVisitorId, hashIp } = require('../Middlewares/Visitor')

// POST /api/v1/visit — public, fired by the frontend on every page load/navigation sir.
// Never blocks the page on failure: this is a best-effort ping, not something a real user
// should ever see an error for.
exports.logVisit = async (req, res) => {
    try {
        const visitorId = ensureVisitorId(req, res)
        const ipHash = hashIp(req.ip)

        // best-effort logged-in attribution sir — same token sources Auth.js checks, but no
        // hard failure if it's missing/expired since this route has no login requirement
        let userId = null
        const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '')
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY)
                userId = decoded?.id || null
            } catch { /* expired/invalid token sir — log the visit anonymously instead */ }
        }

        await Visit.create({
            visitorId,
            ipHash,
            path: typeof req.body?.path === 'string' ? req.body.path.slice(0, 300) : undefined,
            user: userId,
        })

        return res.status(200).json({ success: true })
    } catch (error) {
        console.log('logVisit error:', error.message)
        return res.status(200).json({ success: false })
    }
}
