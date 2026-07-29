const Notification = require('../Models/Notification')
const { addClient, removeClient, pushToUser } = require('../utils/NotificationHub')

// GET /notifications sir — most recent first, capped at 50 (this is a bell dropdown, not a
// full inbox page). Returns unreadCount alongside the list so the Navbar badge doesn't need
// a second round-trip.
exports.getNotifications = async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ user: req.User.id }).sort({ createdAt: -1 }).limit(50),
            Notification.countDocuments({ user: req.User.id, read: false }),
        ])

        return res.status(200).json({ success: true, notifications, unreadCount })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to load notifications' })
    }
}

// PATCH /notifications/:id/read sir
exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params
        // scoped to req.User.id sir — a user can only ever mark their OWN notifications read
        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: req.User.id },
            { read: true },
            { returnDocument: 'after' }
        )
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' })
        }
        return res.status(200).json({ success: true, notification })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to update notification' })
    }
}

// PATCH /notifications/read-all sir — the "mark all read" bulk action in the bell dropdown
exports.markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.User.id, read: false }, { read: true })
        return res.status(200).json({ success: true, message: 'All notifications marked as read' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to update notifications' })
    }
}

// GET /notifications/stream sir — SSE, kept open by the bell so a new notification shows up
// the instant notify() below creates one, instead of waiting for the ~30s poll. Auth via
// query-param token (see Middlewares/Auth.js) since EventSource can't send custom headers.
// The poll in NotificationBell.jsx keeps running underneath as a fallback: Render's free
// tier can restart the process mid-connection, and EventSource auto-reconnects on its own
// but there's no reason to also make the poll depend on this succeeding.
exports.streamNotifications = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    addClient(req.User.id, res)

    // comment ping every 25s sir — keeps proxies/load balancers (Render's included) from
    // treating an idle SSE connection as dead and closing it out from under us
    const keepAlive = setInterval(() => {
        try { res.write(': ping\n\n') } catch { /* connection already gone, cleanup below handles it */ }
    }, 25000)

    req.on('close', () => {
        clearInterval(keepAlive)
        removeClient(req.User.id, res)
    })
}

// internal helper sir — call this from anywhere else in the backend to notify a user
// (credits low, plan expiring, support replied, refund issued, etc). Fire-and-forget, same
// pattern as utils/AdminLog.js's logAi — a failed write here should never break the caller
const notify = ({ user, type, message, link = null }) => {
    Notification.create({ user, type, message, link })
        .then(async (doc) => {
            const unreadCount = await Notification.countDocuments({ user, read: false })
            pushToUser(user, doc, unreadCount)
        })
        .catch((err) => console.log('Notification write failed:', err.message))
}

module.exports.notify = notify
