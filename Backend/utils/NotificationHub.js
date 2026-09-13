// in-process SSE hub sir — tracks which users currently have the notification bell's
// EventSource open, so notify() (Notification.js controller) can push a new notification
// the instant it's created instead of the client waiting for its next poll. Purely in-memory:
// a Render restart/redeploy just drops every open connection, the frontend's EventSource
// auto-reconnects, and the existing poll interval still runs underneath as a safety net —
// so there's no state here that ever needs to survive a process restart.
const clientsByUser = new Map()

// called once per opened stream sir — GET /notifications/stream in controllers/Notification.js
const addClient = (userId, res) => {
    const key = String(userId)
    if (!clientsByUser.has(key)) clientsByUser.set(key, new Set())
    clientsByUser.get(key).add(res)
}

// called on 'close' sir — always pair with addClient so a disconnected client is never
// broadcast to again (that would throw trying to write to a closed response)
const removeClient = (userId, res) => {
    const key = String(userId)
    const set = clientsByUser.get(key)
    if (!set) return
    set.delete(res)
    if (set.size === 0) clientsByUser.delete(key)
}

// called by notify() right after the Notification doc is saved sir — fans out to every tab/
// device that user currently has open, no-op if they have none open (poll will pick it up
// next time regardless, this is purely a "make it feel instant" push)
const pushToUser = (userId, notification, unreadCount) => {
    const key = String(userId)
    const set = clientsByUser.get(key)
    if (!set || set.size === 0) return
    const payload = `event: notification\ndata: ${JSON.stringify({ notification, unreadCount })}\n\n`
    for (const res of set) {
        try {
            res.write(payload)
        } catch {
            // dead connection sir — removeClient will also fire from its own 'close' handler,
            // this just stops the current pushToUser loop from throwing on the way there
            set.delete(res)
        }
    }
}

module.exports = { addClient, removeClient, pushToUser }
