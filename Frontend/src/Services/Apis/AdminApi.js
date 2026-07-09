const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const AdminData = {
    overview: BASE_URL + "/admin/overview",
    users: BASE_URL + "/admin/users",
    banUser: BASE_URL + "/admin/users",         // + /:userId/ban
    unbanUser: BASE_URL + "/admin/users",       // + /:userId/unban
    setRole: BASE_URL + "/admin/users",         // + /:userId/role
    payments: BASE_URL + "/admin/payments",
    audit: BASE_URL + "/admin/audit",
    aiLogs: BASE_URL + "/admin/ai-logs",
    activeAnnouncement: BASE_URL + "/announcements/active",
    announcements: BASE_URL + "/admin/announcements",
    deactivateAnnouncement: BASE_URL + "/admin/announcements",  // + /:id/deactivate
}
