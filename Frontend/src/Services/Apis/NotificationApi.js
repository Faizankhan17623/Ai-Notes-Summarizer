const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const NotificationData = {
    list: BASE_URL + "/notifications",
    markRead: BASE_URL + "/notifications",        // + /:id/read
    markAllRead: BASE_URL + "/notifications/read-all",
}
