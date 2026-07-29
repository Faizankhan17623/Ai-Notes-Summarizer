import { logError } from "../../utils/logError.js"
import { apiConnector } from "../apiConnector.js"
import { NotificationData } from "../Apis/NotificationApi.js"
import { setNotifications, markReadLocal, markAllReadLocal } from "../../Slices/notificationSlice.js"

const { list, markRead, markAllRead } = NotificationData

// called once on mount/login, then every ~90s as a fallback while logged in (see the Navbar
// bell's useEffect interval) — new notifications normally arrive live via useNotificationStream's
// SSE connection, this just reconciles read/unread state and covers any gap in delivery.
export function GetNotifications(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", list, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setNotifications({ notifications: response.data.notifications, unreadCount: response.data.unreadCount }))
        } catch (error) {
            logError("Error fetching notifications", error)
        }
    }
}

export function MarkNotificationRead(id, token) {
    return async (dispatch) => {
        dispatch(markReadLocal(id))
        try {
            await apiConnector("PATCH", `${markRead}/${id}/read`, null, {
                Authorization: `Bearer ${token}`
            })
        } catch (error) {
            logError("Error marking notification read", error)
        }
    }
}

export function MarkAllNotificationsRead(token) {
    return async (dispatch) => {
        dispatch(markAllReadLocal())
        try {
            await apiConnector("PATCH", markAllRead, null, {
                Authorization: `Bearer ${token}`
            })
        } catch (error) {
            logError("Error marking all notifications read", error)
        }
    }
}
