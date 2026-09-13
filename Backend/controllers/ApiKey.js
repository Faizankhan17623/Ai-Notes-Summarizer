const crypto = require('crypto')
const User = require('../Models/User')
const { hashKey } = require('../Middlewares/ApiKeyAuth.js')
const { getUserPlan } = require('../utils/Plans.js')

// POST /api-key — generates a NEW key sir, replacing any existing one (only one active key per user)
// the raw key is returned exactly once here and never again — only its hash is stored
exports.generateApiKey = async (req, res) => {
    try {
        const id = req.User.id

        const plan = await getUserPlan(id)
        if (!plan || plan.key === 'Basic') {
            return res.status(403).json({
                success: false,
                message: 'API access requires a Pro or Pro Max plan, please upgrade to use it',
            })
        }

        const rawKey = `nsk_${crypto.randomBytes(24).toString('hex')}`

        await User.findByIdAndUpdate(id, {
            apiKeyHash: hashKey(rawKey),
            apiKeyCreatedAt: new Date(),
            apiKeyLastUsedAt: null,
        })

        return res.status(201).json({
            success: true,
            message: 'API key generated — copy it now, it will not be shown again',
            apiKey: rawKey,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to generate an API key' })
    }
}

// GET /api-key — status only sir, never the raw key itself
exports.getApiKeyStatus = async (req, res) => {
    try {
        const id = req.User.id
        const user = await User.findById(id).select('apiKeyHash apiKeyCreatedAt apiKeyLastUsedAt')

        return res.status(200).json({
            success: true,
            hasKey: Boolean(user.apiKeyHash),
            createdAt: user.apiKeyCreatedAt,
            lastUsedAt: user.apiKeyLastUsedAt,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load API key status' })
    }
}

// DELETE /api-key sir — revokes it immediately, any request using the old key fails from then on
exports.revokeApiKey = async (req, res) => {
    try {
        const id = req.User.id
        await User.findByIdAndUpdate(id, { apiKeyHash: null, apiKeyCreatedAt: null, apiKeyLastUsedAt: null })
        return res.status(200).json({ success: true, message: 'API key revoked' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to revoke the API key' })
    }
}
