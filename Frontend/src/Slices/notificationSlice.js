import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    notifications: [],
    unreadCount: 0,
}

const notificationSlice = createSlice({
    name: "notification",
    initialState,
    reducers: {
        setNotifications(state, value) {
            state.notifications = value.payload.notifications
            state.unreadCount = value.payload.unreadCount
        },
        // pushed live over SSE sir (see useNotificationStream) — prepend so it appears at the
        // top of the dropdown immediately, same shape as one entry from setNotifications
        addLiveNotification(state, value) {
            const { notification, unreadCount } = value.payload
            if (state.notifications.some((n) => n._id === notification._id)) return
            state.notifications.unshift(notification)
            state.unreadCount = unreadCount
        },
        // optimistic sir — the bell dropdown should feel instant, the next poll reconciles anyway
        markReadLocal(state, value) {
            const n = state.notifications.find((n) => n._id === value.payload)
            if (n && !n.read) {
                n.read = true
                state.unreadCount = Math.max(0, state.unreadCount - 1)
            }
        },
        markAllReadLocal(state) {
            state.notifications.forEach((n) => { n.read = true })
            state.unreadCount = 0
        },
        clearNotifications(state) {
            state.notifications = []
            state.unreadCount = 0
        },
    }
})

export const { setNotifications, addLiveNotification, markReadLocal, markAllReadLocal, clearNotifications } = notificationSlice.actions
export default notificationSlice.reducer
