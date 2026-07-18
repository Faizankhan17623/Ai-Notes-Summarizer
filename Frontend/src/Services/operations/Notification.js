import { apiConnector } from "../apiConnector.js"
import { NotificationData } from "../Apis/NotificationApi.js"
import { setNotifications, markReadLocal, markAllReadLocal } from "../../Slices/notificationSlice.js"

const { list, markRead, markAllRead } = NotificationData

// polled sir — called once on mount/login, then every ~30s while logged in (see the Navbar
// bell's useEffect interval). No socket/SSE layer, see Models/Notification.js on the backend
// for why polling is the right call for this app's hosting (Render free tier).
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
            console.error("Error fetching notifications", error)
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
            console.error("Error marking notification read", error)
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
            console.error("Error marking all notifications read", error)
        }
    }
}
