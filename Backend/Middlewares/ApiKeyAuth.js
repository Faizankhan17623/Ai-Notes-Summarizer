const crypto = require('crypto')
const User = require('../Models/User')

// hashes a raw API key the same way it's hashed at creation time sir — see controllers/ApiKey.js
const hashKey = (rawKey) => crypto.createHash('sha256').update(rawKey).digest('hex')

// Pro/ProMax-only, summarize-only auth sir — deliberately separate from Middlewares/Auth.js so
// a leaked API key can NEVER be used on any route except POST /external/summarize, unlike a JWT
exports.ApiKeyAuth = async (req, res, next) => {
    try {
        const rawKey = req.header('x-api-key')

        if (!rawKey) {
            return res.status(401).json({
                success: false,
                message: 'Missing x-api-key header',
            })
        }

        const user = await User.findOne({ apiKeyHash: hashKey(rawKey) }).select('role isBanned banReason SubType')

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid API key',
            })
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: user.banReason
                    ? `Your account has been suspended: ${user.banReason}`
                    : 'Your account has been suspended, please contact support',
            })
        }

        // API keys are a Pro/ProMax perk sir — re-checked here too since a downgrade shouldn't
        // leave an old key still working
        if (user.SubType === 'Basic') {
            return res.status(403).json({
                success: false,
                message: 'API access requires a Pro or Pro Max plan',
            })
        }

        req.User = { id: user._id, role: user.role }
        User.findByIdAndUpdate(user._id, { apiKeyLastUsedAt: new Date() }).catch(() => {})

        next()
    } catch (error) {
        console.log(error.message)
        return res.status(401).json({
            success: false,
            message: 'Failed to authenticate the API key',
        })
    }
}

module.exports.hashKey = hashKey
