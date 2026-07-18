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

export const { setNotifications, markReadLocal, markAllReadLocal, clearNotifications } = notificationSlice.actions
export default notificationSlice.reducer
