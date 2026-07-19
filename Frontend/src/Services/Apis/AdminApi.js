const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const AdminData = {
    overview: BASE_URL + "/admin/overview",
    analytics: BASE_URL + "/admin/analytics",
    users: BASE_URL + "/admin/users",
    banUser: BASE_URL + "/admin/users",         // + /:userId/ban
    unbanUser: BASE_URL + "/admin/users",       // + /:userId/unban
    denyAppeal: BASE_URL + "/admin/users",      // + /:userId/deny-appeal
    setRole: BASE_URL + "/admin/users",         // + /:userId/role
    payments: BASE_URL + "/admin/payments",
    refundPayment: BASE_URL + "/admin/payments",   // + /:paymentId/refund
    contactMessages: BASE_URL + "/admin/contact-messages",
    replyToContactMessage: BASE_URL + "/admin/contact-messages",  // + /:messageId/reply
    addInternalNote: BASE_URL + "/admin/contact-messages",  // + /:messageId/notes
    audit: BASE_URL + "/admin/audit",
    aiLogs: BASE_URL + "/admin/ai-logs",
    activeAnnouncement: BASE_URL + "/announcements/active",
    announcements: BASE_URL + "/admin/announcements",
    deactivateAnnouncement: BASE_URL + "/admin/announcements",  // + /:id/deactivate
    traffic: BASE_URL + "/admin/traffic",
}
