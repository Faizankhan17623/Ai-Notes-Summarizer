const Notification = require('../Models/Notification')

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

// internal helper sir — call this from anywhere else in the backend to notify a user
// (credits low, plan expiring, support replied, refund issued, etc). Fire-and-forget, same
// pattern as utils/AdminLog.js's logAi — a failed write here should never break the caller
const notify = ({ user, type, message, link = null }) => {
    Notification.create({ user, type, message, link }).catch((err) =>
        console.log('Notification write failed:', err.message)
    )
}

module.exports.notify = notify
