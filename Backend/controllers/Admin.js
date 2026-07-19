const User = require('../Models/User')
const AiLog = require('../Models/AiLog')
const Payment = require('../Models/Payment')
const AuditLog = require('../Models/AuditLog')
const Announcement = require('../Models/Announcement')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Visit = require('../Models/Visit')
const { PLANS } = require('../utils/Plans')
const { notify } = require('./Notification')

const writeAudit = (actor, action, target, details) => {
    AuditLog.create({ actor, action, target, details }).catch((err) => console.log('AuditLog write failed:', err.message))
}

// allowlist, not a blocklist, sir — '-password' alone still shipped refreshTokenHash,
// apiKeyHash, resetPasswordToken and other secret-adjacent fields to the browser on every
// admin Users-page load. Naming exactly what the admin UI needs means a new sensitive field
// added to the User model later doesn't silently leak until someone remembers to exclude it.
const ADMIN_USER_FIELDS = 'firstName lastName email role SubType Subscription SubscriptionExpires ' +
    'Verified isBanned banReason lockUntil failedLoginAttempts count bonusCredits createdAt'

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

// GET /admin/analytics — cross-user aggregate dashboard sir, separate from the flat Overview counts
exports.getAdminAnalytics = async (req, res) => {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const sinceMonths = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

        // revenue over time sir — daily (30d), weekly (30d), monthly (12mo) rollups from Payment
        const revenueByDay = await Payment.aggregate([
            { $match: { status: 'paid', createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])
        const revenueByWeek = await Payment.aggregate([
            { $match: { status: 'paid', createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%G-W%V', date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])
        const revenueByMonth = await Payment.aggregate([
            { $match: { status: 'paid', createdAt: { $gte: sinceMonths } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])

        // user growth sir — signups per day, last 30 days
        const signupsByDay = await User.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])

        // top users by usage sir — Notes + Chats + AI calls, trailing 30 days, top 20
        const [topByNotes, topByChats, topByAiCalls] = await Promise.all([
            Note.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$user', notes: { $sum: 1 } } }]),
            Chat.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$user', chats: { $sum: 1 } } }]),
            AiLog.aggregate([{ $match: { createdAt: { $gte: since }, user: { $ne: null } } }, { $group: { _id: '$user', aiCalls: { $sum: 1 } } }]),
        ])

        // merge the three per-user maps in Node sir — cleaner than a fragile 3-way $lookup chain
        const usageMap = new Map()
        const bump = (arr, field) => arr.forEach((row) => {
            if (!row._id) return
            const key = row._id.toString()
            const entry = usageMap.get(key) || { userId: row._id, notes: 0, chats: 0, aiCalls: 0 }
            entry[field] = row[field]
            usageMap.set(key, entry)
        })
        bump(topByNotes, 'notes')
        bump(topByChats, 'chats')
        bump(topByAiCalls, 'aiCalls')

        const topUsersRaw = Array.from(usageMap.values())
            .map((u) => ({ ...u, total: u.notes + u.chats + u.aiCalls }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 20)

        const topUserDocs = await User.find({ _id: { $in: topUsersRaw.map((u) => u.userId) } }).select('firstName lastName email SubType')
        const userById = new Map(topUserDocs.map((u) => [u._id.toString(), u]))
        const topUsers = topUsersRaw.map((u) => ({ ...u, user: userById.get(u.userId.toString()) || null }))

        // credit/overage stats sir
        // users currently at their plan's limit sir — ProMax is capped now too (500/mo), so all
        // three tiers are counted. The limit numbers are wired in from PLANS at pipeline-build
        // time since Mongo aggregation can't reference the JS object directly
        const usersAtLimit = await User.aggregate([
            { $match: { SubType: { $in: ['Basic', 'Pro', 'ProMax'] } } },
            { $project: { SubType: 1, count: 1, limit: { $switch: { branches: [
                { case: { $eq: ['$SubType', 'Basic'] }, then: PLANS.Basic.credits },
                { case: { $eq: ['$SubType', 'Pro'] }, then: PLANS.Pro.credits },
            ], default: PLANS.ProMax.credits } } } },
            { $match: { $expr: { $gte: ['$count', '$limit'] } } },
            { $group: { _id: '$SubType', usersAtLimit: { $sum: 1 } } },
        ])

        const [topUpsByDay, topUpTotalsAgg] = await Promise.all([
            Payment.aggregate([
                { $match: { plan: 'CreditPack', status: 'paid', createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
                { $sort: { _id: 1 } },
            ]),
            Payment.aggregate([
                { $match: { plan: 'CreditPack', status: 'paid' } },
                { $group: { _id: null, totalPurchases: { $sum: 1 }, totalRevenue: { $sum: '$amount' }, totalCreditsGranted: { $sum: '$creditsGranted' } } },
            ]),
        ])

        return res.status(200).json({
            success: true,
            analytics: {
                revenue: { byDay: revenueByDay, byWeek: revenueByWeek, byMonth: revenueByMonth },
                signups: { byDay: signupsByDay },
                topUsers,
                creditStats: {
                    usersAtLimit,
                    topUps: { byDay: topUpsByDay, totals: topUpTotalsAgg[0] || { totalPurchases: 0, totalRevenue: 0, totalCreditsGranted: 0 } },
                },
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load analytics' })
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
            User.find(filter).select(ADMIN_USER_FIELDS).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
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

        const user = await User.findByIdAndUpdate(userId, { isBanned: true, banReason: banReason || '' }, { returnDocument: 'after' }).select(ADMIN_USER_FIELDS)
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

        const user = await User.findByIdAndUpdate(userId, { isBanned: false, banReason: '' }, { returnDocument: 'after' }).select(ADMIN_USER_FIELDS)
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

        const user = await User.findByIdAndUpdate(userId, { role }, { returnDocument: 'after' }).select(ADMIN_USER_FIELDS)
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

// PATCH /admin/payments/:paymentId/refund sir — Admin only, CreditPack purchases only for now.
// Plan upgrades (Pro/ProMax) are deliberately NOT refundable here: reverting a subscription
// mid-cycle raises questions this button can't answer on its own (they may have already used
// higher-tier features for days/weeks) — that needs a real downgrade policy decision first,
// so those payments show no refund action in the UI and 400 here if attempted directly.
exports.refundPayment = async (req, res) => {
    try {
        const { paymentId } = req.params

        const payment = await Payment.findById(paymentId)
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' })
        }

        if (payment.plan !== 'CreditPack') {
            return res.status(400).json({
                success: false,
                message: 'Only credit-pack purchases can be refunded here — plan upgrades need manual handling',
            })
        }

        if (payment.status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: `Only a paid payment can be refunded (this one is "${payment.status}")`,
            })
        }

        // reverse exactly what was granted sir — never below 0, in case some credits were
        // already spent since the purchase (that spend isn't undone, only the balance is clamped)
        const user = await User.findByIdAndUpdate(
            payment.user,
            [{ $set: { bonusCredits: { $max: [0, { $subtract: ['$bonusCredits', payment.creditsGranted] }] } } }],
            { returnDocument: 'after' }
        ).select('bonusCredits')

        payment.status = 'refunded'
        await payment.save()

        writeAudit(req.User.id, 'refund_payment', payment.user, `${payment.creditsGranted} credits, ₹${payment.amount}`)
        notify({
            user: payment.user,
            type: 'payment_refunded',
            message: `Your purchase of ${payment.creditsGranted} credits (₹${payment.amount}) has been refunded.`,
        })

        return res.status(200).json({
            success: true,
            message: 'Payment refunded',
            payment,
            bonusCredits: user?.bonusCredits,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to refund payment' })
    }
}

// GET /admin/audit sir
exports.getAuditLog = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('actor', 'firstName lastName email')
            .populate('target', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(200)
        return res.status(200).json({ success: true, logs })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load audit log' })
    }
}

// GET /admin/ai-logs sir — the cost/health monitor feed
exports.getAiLogs = async (req, res) => {
    try {
        const logs = await AiLog.find().populate('user', 'firstName lastName email').sort({ createdAt: -1 }).limit(200)
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
        const announcements = await Announcement.find().populate('createdBy', 'firstName lastName email').sort({ createdAt: -1 })
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

// how far back each preset range reaches sir — 'custom' is handled separately below since
// it needs the caller's from/to instead of "now minus N"
const RANGE_WINDOWS = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
}
// the bucket size scales with the range sir — hourly buckets over a month would be 720
// unreadable bars, and daily buckets over a single day would just be one bar
const BUCKET_FORMAT = {
    day: '%Y-%m-%dT%H:00',
    week: '%Y-%m-%d',
    month: '%Y-%m-%d',
    custom: '%Y-%m-%d',
}

// GET /admin/traffic — unique-visitor + total-visit dashboard sir. Query params:
//   range: 'day' | 'week' | 'month' | 'custom' (default 'week')
//   from, to: ISO date strings, only read when range='custom'
exports.getTraffic = async (req, res) => {
    try {
        const range = ['day', 'week', 'month', 'custom'].includes(req.query.range) ? req.query.range : 'week'

        let start, end
        if (range === 'custom') {
            const parsedFrom = new Date(req.query.from)
            const parsedTo = new Date(req.query.to)
            if (isNaN(parsedFrom) || isNaN(parsedTo) || parsedFrom > parsedTo) {
                return res.status(400).json({ success: false, message: 'Invalid custom date range' })
            }
            start = parsedFrom
            // include the entire "to" day sir — a date-only picker gives midnight, which would
            // otherwise exclude every visit that happened ON the end date
            end = new Date(parsedTo.getTime() + 24 * 60 * 60 * 1000)
        } else {
            end = new Date()
            start = new Date(end.getTime() - RANGE_WINDOWS[range])
        }

        const dateFormat = BUCKET_FORMAT[range]
        const match = { createdAt: { $gte: start, $lte: end } }

        const [visitsByBucket, uniqueByBucket, totals, topPaths] = await Promise.all([
            // total visits per bucket sir — every ping counts, repeat views included
            Visit.aggregate([
                { $match: match },
                { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, visits: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // unique visitors per bucket sir — de-duplicated by the visitor_id cookie within
            // each bucket (a returning visitor still counts once per day/hour, not once total)
            Visit.aggregate([
                { $match: match },
                { $group: { _id: { bucket: { $dateToString: { format: dateFormat, date: '$createdAt' } }, visitor: '$visitorId' } } },
                { $group: { _id: '$_id.bucket', uniqueVisitors: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // whole-window totals sir — visitorId AND ipHash counted separately since one
            // person can look like several IPs (mobile networks) or several people can share
            // one IP (office wifi); showing both is more honest than picking just one
            Visit.aggregate([
                { $match: match },
                { $group: { _id: null, totalVisits: { $sum: 1 }, uniqueVisitorIds: { $addToSet: '$visitorId' }, uniqueIps: { $addToSet: '$ipHash' }, loggedInVisits: { $sum: { $cond: [{ $ne: ['$user', null] }, 1, 0] } } } },
                { $project: { _id: 0, totalVisits: 1, uniqueVisitors: { $size: '$uniqueVisitorIds' }, uniqueIps: { $size: '$uniqueIps' }, loggedInVisits: 1 } },
            ]),
            // most-visited pages in the window sir — top 10, quick "what are people looking at"
            Visit.aggregate([
                { $match: { ...match, path: { $nin: [null, ''] } } },
                { $group: { _id: '$path', visits: { $sum: 1 } } },
                { $sort: { visits: -1 } },
                { $limit: 10 },
            ]),
        ])

        // merge the two per-bucket series into one row each sir, same pattern as topUsers above
        const bucketMap = new Map()
        visitsByBucket.forEach((row) => bucketMap.set(row._id, { bucket: row._id, visits: row.visits, uniqueVisitors: 0 }))
        uniqueByBucket.forEach((row) => {
            const entry = bucketMap.get(row._id) || { bucket: row._id, visits: 0, uniqueVisitors: 0 }
            entry.uniqueVisitors = row.uniqueVisitors
            bucketMap.set(row._id, entry)
        })
        const series = Array.from(bucketMap.values()).sort((a, b) => a.bucket.localeCompare(b.bucket))

        return res.status(200).json({
            success: true,
            traffic: {
                range,
                from: start,
                to: end,
                series,
                totals: totals[0] || { totalVisits: 0, uniqueVisitors: 0, uniqueIps: 0, loggedInVisits: 0 },
                topPaths,
            },
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load traffic data' })
    }
}
