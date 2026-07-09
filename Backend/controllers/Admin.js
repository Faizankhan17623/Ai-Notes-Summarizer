const User = require('../Models/User')
const AiLog = require('../Models/AiLog')
const Payment = require('../Models/Payment')
const AuditLog = require('../Models/AuditLog')
const Announcement = require('../Models/Announcement')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')

const writeAudit = (actor, action, target, details) => {
    AuditLog.create({ actor, action, target, details }).catch((err) => console.log('AuditLog write failed:', err.message))
}

// GET /admin/overview — top-line counts for the admin dashboard sir
exports.getOverview = async (req, res) => {
    try {
        const [userCount, noteCount, chatCount, last24hCalls, failedLast24h] = await Promise.all([
            User.countDocuments(),
            Note.countDocuments(),
            Chat.countDocuments(),
            AiLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
            AiLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, success: false }),
        ])

        const planBreakdown = await User.aggregate([
            { $group: { _id: '$SubType', count: { $sum: 1 } } }
        ])

        return res.status(200).json({
            success: true,
            overview: {
                userCount,
                noteCount,
                chatCount,
                aiCallsLast24h: last24hCalls,
                aiFailuresLast24h: failedLast24h,
                planBreakdown,
            }
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load overview' })
    }
}

// GET /admin/users — paginated user list sir
exports.getUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = 20
        const search = req.query.search?.trim()

        const filter = search
            ? { $or: [{ email: new RegExp(search, 'i') }, { firstName: new RegExp(search, 'i') }, { lastName: new RegExp(search, 'i') }] }
            : {}

        const [users, total] = await Promise.all([
            User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            User.countDocuments(filter),
        ])

        return res.status(200).json({ success: true, users, total, page, pages: Math.ceil(total / limit) })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load users' })
    }
}

// PATCH /admin/users/:userId/ban — sir, Admin only (route-gated)
exports.banUser = async (req, res) => {
    try {
        const { userId } = req.params
        const { banReason } = req.body

        const user = await User.findByIdAndUpdate(userId, { isBanned: true, banReason: banReason || '' }, { new: true }).select('-password')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        writeAudit(req.User.id, 'ban_user', userId, banReason || '')

        return res.status(200).json({ success: true, message: 'User banned', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to ban user' })
    }
}

// PATCH /admin/users/:userId/unban sir
exports.unbanUser = async (req, res) => {
    try {
        const { userId } = req.params

        const user = await User.findByIdAndUpdate(userId, { isBanned: false, banReason: '' }, { new: true }).select('-password')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        writeAudit(req.User.id, 'unban_user', userId)

        return res.status(200).json({ success: true, message: 'User unbanned', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to unban user' })
    }
}

// PATCH /admin/users/:userId/role sir — Admin only, promote/demote User <-> Support <-> Admin
exports.setRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body

        if (!['User', 'Support', 'Admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' })
        }

        const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        writeAudit(req.User.id, 'set_role', userId, role)

        return res.status(200).json({ success: true, message: 'Role updated', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to update role' })
    }
}

// GET /admin/payments sir
exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate('user', 'firstName lastName email').sort({ createdAt: -1 }).limit(100)
        return res.status(200).json({ success: true, payments })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load payments' })
    }
}

// GET /admin/audit sir
exports.getAuditLog = async (req, res) => {
    try {
        const logs = await AuditLog.find().populate('actor', 'firstName lastName email').sort({ createdAt: -1 }).limit(200)
        return res.status(200).json({ success: true, logs })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load audit log' })
    }
}

// GET /admin/ai-logs sir — the cost/health monitor feed
exports.getAiLogs = async (req, res) => {
    try {
        const logs = await AiLog.find().sort({ createdAt: -1 }).limit(200)
        return res.status(200).json({ success: true, logs })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load AI logs' })
    }
}

// GET /admin/announcements/active — public, no auth sir (read in App.jsx banner)
exports.getActiveAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findOne({ active: true }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, announcement })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load announcement' })
    }
}

// GET /admin/announcements sir — all of them, for the admin manager screen
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 })
        return res.status(200).json({ success: true, announcements })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load announcements' })
    }
}

// POST /admin/announcements sir — creating a new active one deactivates the rest
exports.createAnnouncement = async (req, res) => {
    try {
        const { message } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' })
        }

        await Announcement.updateMany({}, { active: false })
        const announcement = await Announcement.create({ message: message.trim(), active: true, createdBy: req.User.id })

        writeAudit(req.User.id, 'create_announcement', null, message.trim())

        return res.status(201).json({ success: true, announcement })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to create announcement' })
    }
}

// PATCH /admin/announcements/:id/deactivate sir
exports.deactivateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params
        await Announcement.findByIdAndUpdate(id, { active: false })
        writeAudit(req.User.id, 'deactivate_announcement', null, id)
        return res.status(200).json({ success: true, message: 'Announcement deactivated' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to deactivate announcement' })
    }
}
