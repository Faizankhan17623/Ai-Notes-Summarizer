const User = require('../Models/User')
const AiLog = require('../Models/AiLog')
const Payment = require('../Models/Payment')
const AuditLog = require('../Models/AuditLog')
const Announcement = require('../Models/Announcement')
const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const Flashcard = require('../Models/Flashcard')
const Quiz = require('../Models/Quiz')
const NoteVersion = require('../Models/NoteVersion')
const StudyPlan = require('../Models/StudyPlan')
const Notification = require('../Models/Notification')
const Visit = require('../Models/Visit')
const SavedView = require('../Models/SavedView')
const ContactMessage = require('../Models/ContactMessage')
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
    'Verified isBanned banReason banType suspensionCount lockUntil failedLoginAttempts count bonusCredits createdAt ' +
    'appealStatus appealMessage appealSubmittedAt'

// GET /admin/overview — top-line counts for the admin dashboard sir
// stays isSupport (not isAdmin) sir — same bar as before, so this doesn't reuse
// getAdminAnalytics's heavier data even though some of it overlaps; a few cheap extra
// counts/aggregates here instead, so Support keeps seeing exactly what it saw before, just
// with trend context added on top
exports.getOverview = async (req, res) => {
    try {
        const dayMs = 24 * 60 * 60 * 1000
        const since24h = new Date(Date.now() - dayMs)
        const since7d = new Date(Date.now() - 7 * dayMs)

        const [
            userCount, noteCount, chatCount, last24hCalls, failedLast24h,
            newUsers7d, newNotes7d, signupsByDay,
        ] = await Promise.all([
            User.countDocuments(),
            Note.countDocuments(),
            Chat.countDocuments(),
            AiLog.countDocuments({ createdAt: { $gte: since24h } }),
            AiLog.countDocuments({ createdAt: { $gte: since24h }, success: false }),
            User.countDocuments({ createdAt: { $gte: since7d } }),
            Note.countDocuments({ createdAt: { $gte: since7d } }),
            // 7-day daily signup counts sir — feeds the overview page's mini sparkline,
            // same $dateToString bucket pattern as getAdminAnalytics's revenue/signup charts
            User.aggregate([
                { $match: { createdAt: { $gte: since7d } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
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
                newUsers7d,
                newNotes7d,
                signupsByDay,
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

        const usageRanked = Array.from(usageMap.values())
            .map((u) => ({ ...u, total: u.notes + u.chats + u.aiCalls }))
            .sort((a, b) => b.total - a.total)

        // fetch docs for everyone with usage first sir, THEN slice to 20 — a deleted user (their
        // Notes/Chats/AiLog rows outlive the account) would otherwise still consume a top-20 slot
        // and bump out a real active user, on top of rendering as a dead "Deleted user" row
        const topUserDocs = await User.find({ _id: { $in: usageRanked.map((u) => u.userId) } }).select('firstName lastName email SubType')
        const userById = new Map(topUserDocs.map((u) => [u._id.toString(), u]))
        const topUsers = usageRanked
            .filter((u) => userById.has(u.userId.toString()))
            .slice(0, 20)
            .map((u) => ({ ...u, user: userById.get(u.userId.toString()) }))

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

        // Admin is never listed here sir — there's exactly one, it can't be banned/role-changed
        // via this page anyway (setRole above refuses to touch an Admin row), and Support
        // shouldn't even see that account exists in the Users table
        const filter = search
            ? { role: { $ne: 'Admin' }, $or: [{ email: new RegExp(search, 'i') }, { firstName: new RegExp(search, 'i') }, { lastName: new RegExp(search, 'i') }] }
            : { role: { $ne: 'Admin' } }

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

// PATCH /admin/users/:userId/suspend — sir, Admin only (route-gated). The 2-strike,
// appealable track — see suspensionCount's comment in Models/User.js for the full lifecycle.
// Blocked once a user is already at strike 2 (denied twice): from there the Admin must
// explicitly pick Ban or Delete on the Users page, nothing here auto-escalates further.
exports.suspendUser = async (req, res) => {
    try {
        const { userId } = req.params
        const { banReason } = req.body

        const target = await User.findById(userId).select('role suspensionCount isBanned')
        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        if (target.role === 'Admin') {
            return res.status(400).json({ success: false, message: "The Admin's account can't be suspended" })
        }
        if (target.suspensionCount >= 2) {
            return res.status(400).json({ success: false, message: 'This account has already used both suspensions — Ban or Delete it instead' })
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                isBanned: true,
                banReason,
                banType: 'suspend',
                $inc: { suspensionCount: 1 },
                appealStatus: 'none',
                appealMessage: '',
                appealSubmittedAt: null,
            },
            { returnDocument: 'after' }
        ).select(ADMIN_USER_FIELDS)

        writeAudit(req.User.id, 'suspend_user', userId, banReason)

        return res.status(200).json({ success: true, message: 'User suspended', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to suspend user' })
    }
}

// PATCH /admin/users/:userId/ban — sir, Admin only (route-gated). Instant and permanent,
// bypasses the suspend/appeal cycle entirely — never touches suspensionCount (see its comment
// in Models/User.js), so a later Unban leaves the account at whatever strike count it already
// had (0 if it had never been suspended before).
exports.directBanUser = async (req, res) => {
    try {
        const { userId } = req.params
        const { banReason } = req.body

        const target = await User.findById(userId).select('role')
        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        if (target.role === 'Admin') {
            return res.status(400).json({ success: false, message: "The Admin's account can't be banned" })
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { isBanned: true, banReason, banType: 'direct', appealStatus: 'denied', appealMessage: '', appealSubmittedAt: null },
            { returnDocument: 'after' }
        ).select(ADMIN_USER_FIELDS)

        writeAudit(req.User.id, 'direct_ban_user', userId, banReason)

        return res.status(200).json({ success: true, message: 'User banned', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to ban user' })
    }
}

// PATCH /admin/users/:userId/unban sir — full reset, regardless of which track (suspend or
// direct) put the account here. suspensionCount back to 0 too sir — an unban is a clean slate,
// not just "one strike forgiven". Blocked entirely once permanently banned — a direct ban
// (banType 'direct', appealStatus always 'denied') or a strike-2-denied suspension can ONLY be
// resolved by Ban (already the state, no-op) or Delete (see deleteUser below), never Unban.
exports.unbanUser = async (req, res) => {
    try {
        const { userId } = req.params

        const target = await User.findById(userId).select('isBanned banType suspensionCount appealStatus')
        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        const isPermanent = target.isBanned && target.appealStatus === 'denied'
        if (isPermanent) {
            return res.status(400).json({ success: false, message: 'This account is permanently banned and cannot be unbanned — delete it instead if needed' })
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { isBanned: false, banReason: '', banType: null, suspensionCount: 0, appealStatus: 'none', appealMessage: '', appealSubmittedAt: null },
            { returnDocument: 'after' }
        ).select(ADMIN_USER_FIELDS)

        writeAudit(req.User.id, 'unban_user', userId)

        return res.status(200).json({ success: true, message: 'User unbanned', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to unban user' })
    }
}

// PATCH /admin/users/:userId/deny-appeal sir — Admin only. Only valid on the suspend track
// (a direct ban's appealStatus is already 'denied' with nothing pending to deny). Denying
// strike 1's appeal bumps suspensionCount to 2 and reopens ONE more appeal window (resets
// appealStatus to 'none') — the "last chance" sir asked for, no separate admin click needed
// to get there. Denying strike 2's appeal is terminal: appealStatus stays 'denied' for good,
// and the frontend then shows Ban/Delete instead of Suspend for this row (see Users.jsx).
exports.denyAppeal = async (req, res) => {
    try {
        const { userId } = req.params

        const target = await User.findById(userId).select('isBanned appealStatus banType suspensionCount')
        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        if (!target.isBanned || target.appealStatus !== 'pending') {
            return res.status(400).json({ success: false, message: 'This user has no pending appeal to deny' })
        }

        // strike 1 denied -> reopen one more appeal window sir; strike 2 (or already maxed
        // out) denied -> terminal, appealStatus just stays 'denied'
        const reopening = target.banType === 'suspend' && target.suspensionCount < 2
        const update = reopening
            ? { suspensionCount: target.suspensionCount + 1, appealStatus: 'none', appealMessage: '', appealSubmittedAt: null }
            : { appealStatus: 'denied' }

        const user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after' }).select(ADMIN_USER_FIELDS)

        writeAudit(req.User.id, 'deny_appeal', userId)

        return res.status(200).json({
            success: true,
            message: reopening ? 'Appeal denied — the user gets one more appeal window' : 'Appeal denied — this decision is final',
            user,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to deny the appeal' })
    }
}

// helper sir — every place a user account is permanently removed (single or bulk delete
// below) needs the exact same cascade: the User doc itself plus everything they own across
// collections that reference it by `user`. Historical/audit-trail collections (AuditLog.target,
// Payment.user, AiLog.user, Visit.user) are deliberately left alone — those already tolerate a
// missing/deleted user (see e.g. Admin/Payments.jsx rendering `user: null` rows) and exist
// precisely to survive the account that generated them, same as a real accounting/audit trail would.
const cascadeDeleteUser = async (userId) => {
    await Promise.all([
        Note.deleteMany({ user: userId }),
        Chat.deleteMany({ user: userId }),
        Flashcard.deleteMany({ user: userId }),
        Quiz.deleteMany({ user: userId }),
        NoteVersion.deleteMany({ user: userId }),
        StudyPlan.deleteMany({ user: userId }),
        Notification.deleteMany({ user: userId }),
        SavedView.deleteMany({ user: userId }),
    ])
    await User.findByIdAndDelete(userId)
}

// DELETE /admin/users/:userId sir — Admin only, hard delete, immediate (no recovery buffer —
// that's the self-service deleteAccount's pattern for a user deleting their OWN account;
// an admin-initiated delete is already a deliberate, reviewed decision, same instant-effect
// convention as ban/unban above)
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params

        const target = await User.findById(userId).select('role email firstName lastName')
        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        if (target.role === 'Admin') {
            return res.status(400).json({ success: false, message: "The Admin's account can't be deleted" })
        }

        await cascadeDeleteUser(userId)

        writeAudit(req.User.id, 'delete_user', userId, `${target.firstName} ${target.lastName} <${target.email}>`)

        return res.status(200).json({ success: true, message: 'User deleted' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to delete user' })
    }
}

// PATCH /admin/users/:userId/role sir — Admin only, promote/demote User <-> Support <-> Admin
exports.setRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body

        // exactly one Admin, ever, sir — this endpoint can only toggle a user between User
        // and Support. It can't create a second Admin, and it can't touch the existing
        // Admin's own role (that would silently leave the app with zero admins)
        if (!['User', 'Support'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' })
        }

        const target = await User.findById(userId).select('role')
        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        if (target.role === 'Admin') {
            return res.status(400).json({ success: false, message: "The Admin's role can't be changed here" })
        }

        const user = await User.findByIdAndUpdate(userId, { role }, { returnDocument: 'after' }).select(ADMIN_USER_FIELDS)

        writeAudit(req.User.id, 'set_role', userId, role)

        return res.status(200).json({ success: true, message: 'Role updated', user })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to update role' })
    }
}

// PATCH /admin/users/bulk-suspend sir — Admin only, bulk version of suspendUser above. Loops
// the same single-user update+audit (not updateMany) because AuditLog.target is one ObjectId
// per row, not an array — a bulk action still needs one audit row per affected user to keep
// that trail meaningful. Per-user failures (Admin row, already at 2 strikes, bad id) are
// collected and reported, not thrown, so one bad row in a batch doesn't silently drop the rest.
exports.bulkSuspendUsers = async (req, res) => {
    try {
        const { userIds, banReason } = req.body

        const suspended = []
        const failed = []
        for (const userId of userIds) {
            try {
                const target = await User.findById(userId).select('role suspensionCount')
                if (!target) {
                    failed.push({ userId, message: 'User not found' })
                    continue
                }
                if (target.role === 'Admin') {
                    failed.push({ userId, message: "The Admin's account can't be suspended" })
                    continue
                }
                if (target.suspensionCount >= 2) {
                    failed.push({ userId, message: 'Already used both suspensions — Ban or Delete instead' })
                    continue
                }

                await User.findByIdAndUpdate(userId, {
                    isBanned: true,
                    banReason,
                    banType: 'suspend',
                    $inc: { suspensionCount: 1 },
                    appealStatus: 'none',
                    appealMessage: '',
                    appealSubmittedAt: null,
                })
                writeAudit(req.User.id, 'suspend_user', userId, banReason)
                suspended.push(userId)
            } catch {
                failed.push({ userId, message: 'Failed to suspend this user' })
            }
        }

        return res.status(200).json({ success: true, message: `Suspended ${suspended.length} of ${userIds.length} users`, suspended, failed })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to run the bulk suspend' })
    }
}

// PATCH /admin/users/bulk-ban sir — Admin only, bulk version of directBanUser above. Same
// loop/audit pattern as bulkSuspendUsers.
exports.bulkDirectBanUsers = async (req, res) => {
    try {
        const { userIds, banReason } = req.body

        const banned = []
        const failed = []
        for (const userId of userIds) {
            try {
                const target = await User.findById(userId).select('role')
                if (!target) {
                    failed.push({ userId, message: 'User not found' })
                    continue
                }
                if (target.role === 'Admin') {
                    failed.push({ userId, message: "The Admin's account can't be banned" })
                    continue
                }

                await User.findByIdAndUpdate(userId, { isBanned: true, banReason, banType: 'direct', appealStatus: 'denied', appealMessage: '', appealSubmittedAt: null })
                writeAudit(req.User.id, 'direct_ban_user', userId, banReason)
                banned.push(userId)
            } catch {
                failed.push({ userId, message: 'Failed to ban this user' })
            }
        }

        return res.status(200).json({ success: true, message: `Banned ${banned.length} of ${userIds.length} users`, banned, failed })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to run the bulk ban' })
    }
}

// DELETE /admin/users/bulk-delete sir — Admin only, bulk version of deleteUser above. Same
// loop/audit pattern; cascadeDeleteUser handles each user's owned data + the User doc itself.
exports.bulkDeleteUsers = async (req, res) => {
    try {
        const { userIds } = req.body

        const deleted = []
        const failed = []
        for (const userId of userIds) {
            try {
                const target = await User.findById(userId).select('role email firstName lastName')
                if (!target) {
                    failed.push({ userId, message: 'User not found' })
                    continue
                }
                if (target.role === 'Admin') {
                    failed.push({ userId, message: "The Admin's account can't be deleted" })
                    continue
                }

                await cascadeDeleteUser(userId)
                writeAudit(req.User.id, 'delete_user', userId, `${target.firstName} ${target.lastName} <${target.email}>`)
                deleted.push(userId)
            } catch {
                failed.push({ userId, message: 'Failed to delete this user' })
            }
        }

        return res.status(200).json({ success: true, message: `Deleted ${deleted.length} of ${userIds.length} users`, deleted, failed })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to run the bulk delete' })
    }
}

// PATCH /admin/users/bulk-role sir — Admin only, same guard per user as setRole above; an
// Admin row (or the sole Admin themselves) in the batch is skipped and reported in `failed`
// rather than failing the whole batch.
exports.bulkSetRole = async (req, res) => {
    try {
        const { userIds, role } = req.body

        if (!['User', 'Support'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' })
        }

        const updated = []
        const failed = []
        for (const userId of userIds) {
            try {
                const target = await User.findById(userId).select('role')
                if (!target) {
                    failed.push({ userId, message: 'User not found' })
                    continue
                }
                if (target.role === 'Admin') {
                    failed.push({ userId, message: "The Admin's role can't be changed here" })
                    continue
                }

                await User.findByIdAndUpdate(userId, { role })
                writeAudit(req.User.id, 'set_role', userId, role)
                updated.push(userId)
            } catch {
                failed.push({ userId, message: 'Failed to update this user\'s role' })
            }
        }

        return res.status(200).json({ success: true, message: `Updated ${updated.length} of ${userIds.length} users`, updated, failed })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to run the bulk role update' })
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
// paginated the same way getUsers is sir — 20/page, capped so one request can't pull an
// unbounded history; page/pages/total returned alongside logs so the frontend can drive
// the same Prev/Next controls the Users table already has
exports.getAuditLog = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = 20

        const [logs, total] = await Promise.all([
            AuditLog.find()
                .populate('actor', 'firstName lastName email')
                .populate('target', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            AuditLog.countDocuments(),
        ])

        return res.status(200).json({ success: true, logs, total, page, pages: Math.ceil(total / limit) })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load audit log' })
    }
}

// GET /admin/ai-logs sir — the cost/health monitor feed, same pagination shape as above
// optional ?userSearch=, ?model=, ?success=true|false filters sir, alongside the existing
// pagination. userSearch resolves matching User ids first (AiLog.user is a ref, not an
// embedded name/email, so it can't be RegExp-matched directly the way getUsers' search is)
exports.getAiLogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = 20
        const { userSearch, model, success } = req.query

        const filter = {}
        if (userSearch?.trim()) {
            const term = userSearch.trim()
            const matchingUsers = await User.find({
                $or: [{ email: new RegExp(term, 'i') }, { firstName: new RegExp(term, 'i') }, { lastName: new RegExp(term, 'i') }]
            }).select('_id')
            filter.user = { $in: matchingUsers.map((u) => u._id) }
        }
        if (model?.trim()) filter.model = model.trim()
        if (success === 'true' || success === 'false') filter.success = success === 'true'

        const [logs, total] = await Promise.all([
            AiLog.find(filter).populate('user', 'firstName lastName email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            AiLog.countDocuments(filter),
        ])

        return res.status(200).json({ success: true, logs, total, page, pages: Math.ceil(total / limit) })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load AI logs' })
    }
}

// GET /admin/announcements/active — public, no auth sir (read in App.jsx banner)
// up to MAX_ACTIVE_ANNOUNCEMENTS at once sir — see createAnnouncement's comment for why 3.
// A timed announcement only counts as live between startAt and endAt sir — active:true alone
// isn't enough once timing exists, since a timed one can be flagged active but not yet started
// (Scheduled) or past its window (Expired); an untimed one (startAt: null) is live whenever
// active:true, same as before timing was added
exports.getActiveAnnouncement = async (req, res) => {
    try {
        const now = new Date()
        const announcements = await Announcement.find({
            active: true,
            $or: [
                { startAt: null },
                { startAt: { $lte: now }, endAt: { $gte: now } },
            ],
        }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, announcements })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load announcements' })
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

// up to 3 can occupy a "live" slot at once sir — the public banner (AnnouncementBanner.jsx)
// stacks them, so unlike the old one-active-at-a-time model this no longer auto-deactivates
// anything on create; once 3 slots are taken, publishing a 4th is blocked until the admin
// frees one (deactivate/delete) rather than silently bumping the oldest. An expired timed
// announcement (endAt already passed) does NOT hold a slot — same reasoning as
// getActiveAnnouncement's $or above, just inverted for "did this one already finish"
const MAX_ACTIVE_ANNOUNCEMENTS = 3

// the timed window sir — admin picks startAt/endAt explicitly now (a datetime-local input on
// the frontend), these two constants are just the RULES that window has to satisfy, not a
// duration that gets auto-applied: start must be tomorrow-or-later, and start->end can't
// exceed MAX_WINDOW_DAYS — anywhere from a few hours to the full 15 days is fine
const DAY_MS = 24 * 60 * 60 * 1000
const MIN_START_DELAY_MS = DAY_MS
const MAX_WINDOW_DAYS = 15

// parses a datetime-local string ("YYYY-MM-DDTHH:mm") into a real Date sir, and validates it
// parsed to something real — `new Date(garbage)` silently yields an Invalid Date rather than
// throwing, which is exactly the kind of string-shaped bug this app has been bitten by before,
// so this is the one place that boundary gets checked before the string is ever trusted again
const parseRequiredDate = (value) => {
    if (!value) return { error: 'is required' }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return { error: 'is not a valid date/time' }
    return { date }
}

// POST /admin/announcements sir — accepts { message, timed, startAt, endAt }. startAt/endAt
// are only read/validated when timed is true; an untimed announcement ignores them entirely
// (same as before — active until manually deactivated, no window)
exports.createAnnouncement = async (req, res) => {
    try {
        const { message, timed, startAt: startAtInput, endAt: endAtInput } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' })
        }

        const now = new Date()
        const activeCount = await Announcement.countDocuments({
            active: true,
            $or: [{ startAt: null }, { endAt: { $gte: now } }],
        })
        if (activeCount >= MAX_ACTIVE_ANNOUNCEMENTS) {
            return res.status(400).json({
                success: false,
                message: `Only ${MAX_ACTIVE_ANNOUNCEMENTS} announcements can be active at once — deactivate or delete one first`,
            })
        }

        const announcementDoc = { message: message.trim(), active: true, createdBy: req.User.id }

        if (timed) {
            const startResult = parseRequiredDate(startAtInput)
            if (startResult.error) {
                return res.status(400).json({ success: false, message: `Start date/time ${startResult.error}` })
            }
            const endResult = parseRequiredDate(endAtInput)
            if (endResult.error) {
                return res.status(400).json({ success: false, message: `End date/time ${endResult.error}` })
            }
            const { date: startAt } = startResult
            const { date: endAt } = endResult

            // tomorrow-or-later sir — comparing real Date <-> Date via getTime(), never string
            // comparison (which would sort "2026-2-1" before "2026-10-1" lexicographically)
            const earliestStart = new Date(now.getTime() + MIN_START_DELAY_MS)
            if (startAt.getTime() < earliestStart.getTime()) {
                return res.status(400).json({ success: false, message: 'Start date/time must be tomorrow or later' })
            }
            if (endAt.getTime() <= startAt.getTime()) {
                return res.status(400).json({ success: false, message: 'End date/time must be after the start date/time' })
            }
            if (endAt.getTime() - startAt.getTime() > MAX_WINDOW_DAYS * DAY_MS) {
                return res.status(400).json({ success: false, message: `The window can't be longer than ${MAX_WINDOW_DAYS} days` })
            }

            announcementDoc.startAt = startAt
            announcementDoc.endAt = endAt
        }

        const announcement = await Announcement.create(announcementDoc)

        writeAudit(req.User.id, 'create_announcement', null, message.trim())

        return res.status(201).json({ success: true, announcement })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to create announcement' })
    }
}

// PATCH /admin/announcements/:id sir — edits the message text only; active/inactive still
// goes through deactivate below (re-activating isn't supported — that'd need its own
// MAX_ACTIVE_ANNOUNCEMENTS check, and "publish a new one" already covers that need)
exports.editAnnouncement = async (req, res) => {
    try {
        const { id } = req.params
        const { message } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' })
        }

        const announcement = await Announcement.findByIdAndUpdate(id, { message: message.trim() }, { returnDocument: 'after' })
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found' })
        }

        writeAudit(req.User.id, 'edit_announcement', null, message.trim())

        return res.status(200).json({ success: true, announcement })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to edit announcement' })
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

// DELETE /admin/announcements/:id sir — hard delete, separate from deactivate above (that
// just hides it from the public banner but keeps it in the admin manager's history/list)
exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params
        const announcement = await Announcement.findByIdAndDelete(id)
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found' })
        }
        writeAudit(req.User.id, 'delete_announcement', null, announcement.message)
        return res.status(200).json({ success: true, message: 'Announcement deleted' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to delete announcement' })
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
            // most-visited pages in the window sir — top 10, quick "what are people looking at".
            // "/" is excluded too sir, not just null/empty — the homepage gets hit by every
            // single visit before any real navigation happens, so it always wins #1 and drowns
            // out the pages people actually chose to go to
            Visit.aggregate([
                { $match: { ...match, path: { $nin: [null, '', '/'] } } },
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

// GET /admin/saved-views?page=users sir — personal to the caller, isSupport-gated same as
// the list pages themselves (Support/Admin can all save/reuse their own filter sets)
exports.getSavedViews = async (req, res) => {
    try {
        const { page } = req.query
        if (!['users', 'payments', 'audit', 'ai-logs'].includes(page)) {
            return res.status(400).json({ success: false, message: 'Invalid page' })
        }

        const views = await SavedView.find({ user: req.User.id, page }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, views })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load saved views' })
    }
}

// POST /admin/saved-views sir — body: { page, name, filters }
exports.createSavedView = async (req, res) => {
    try {
        const { page, name, filters } = req.body

        if (!['users', 'payments', 'audit', 'ai-logs'].includes(page)) {
            return res.status(400).json({ success: false, message: 'Invalid page' })
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'A name is required' })
        }
        if (!filters || typeof filters !== 'object') {
            return res.status(400).json({ success: false, message: 'Filters are required' })
        }

        const view = await SavedView.create({ user: req.User.id, page, name: name.trim(), filters })
        return res.status(201).json({ success: true, view })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to save the view' })
    }
}

// DELETE /admin/saved-views/:viewId sir — scoped to the caller, one agent can't delete
// another agent's saved view even though both are Support/Admin
exports.deleteSavedView = async (req, res) => {
    try {
        const { viewId } = req.params
        const view = await SavedView.findOneAndDelete({ _id: viewId, user: req.User.id })
        if (!view) {
            return res.status(404).json({ success: false, message: 'Saved view not found' })
        }
        return res.status(200).json({ success: true, message: 'Saved view deleted' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to delete the saved view' })
    }
}

// GET /admin/contact-messages/:messageId/user-activity sir — lets Support/Admin see
// the submitter's recent AI usage + credit standing right from the ticket, instead of
// separately searching for them on the Users/AI-logs pages. Matched by email since a contact
// submission isn't guaranteed to come from a registered account (public, pre-account form) —
// when there's no matching User this returns matched:false rather than a 404, since "this
// submitter has no account" is a normal, expected outcome here, not an error.
exports.getContactMessageUserActivity = async (req, res) => {
    try {
        const { messageId } = req.params

        const contactMessage = await ContactMessage.findById(messageId).select('email')
        if (!contactMessage) {
            return res.status(404).json({ success: false, message: 'Contact message not found' })
        }

        const user = await User.findOne({ email: contactMessage.email }).select(ADMIN_USER_FIELDS)
        if (!user) {
            return res.status(200).json({ success: true, matched: false })
        }

        const recentAiLogs = await AiLog.find({ user: user._id }).sort({ createdAt: -1 }).limit(20)

        return res.status(200).json({
            success: true,
            matched: true,
            user,
            recentAiLogs,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: "Failed to load this user's activity" })
    }
}
