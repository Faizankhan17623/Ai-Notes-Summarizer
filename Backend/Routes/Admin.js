const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport, canRefund } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { banUserRules, setRoleRules, bulkBanUsersRules, bulkSetRoleRules, createSavedViewRules, deleteSavedViewRules, userActivityRules } = require('../Middlewares/ValidationRules.js')
const {
    getOverview,
    getAdminAnalytics,
    getUsers,
    banUser,
    unbanUser,
    denyAppeal,
    setRole,
    bulkBanUsers,
    bulkSetRole,
    getPayments,
    refundPayment,
    getAuditLog,
    getAiLogs,
    getActiveAnnouncement,
    getAnnouncements,
    createAnnouncement,
    deactivateAnnouncement,
    getTraffic,
    getSavedViews,
    createSavedView,
    deleteSavedView,
    getContactMessageUserActivity,
} = require('../controllers/Admin.js')
const { getContactMessages, replyToContactMessage, addInternalNote } = require('../controllers/Contact.js')

// public sir — the frontend banner reads this on every page, no login required
route.get('/announcements/active', getActiveAnnouncement)

// read-only "view/help" routes sir — Support AND Admin both pass, nothing here can ban,
// change roles, or post site-wide, so it's safe for Support to have on their own
route.get('/admin/overview', Auth, isSupport, getOverview)
route.get('/admin/users', Auth, isSupport, getUsers)
route.get('/admin/payments', Auth, isSupport, getPayments)
route.get('/admin/ai-logs', Auth, isSupport, getAiLogs)
route.get('/admin/contact-messages', Auth, isSupport, getContactMessages)
// replying/resolving a ticket is exactly the "help" action Support exists for sir — no
// destructive/site-wide effect, so this stays isSupport too, not isAdmin
route.post('/admin/contact-messages/:messageId/reply', doubleCsrfProtection, Auth, isSupport, replyToContactMessage)
// private handoff notes sir — same isSupport gate as reply above, never visible to the
// submitter, only ever read back through this same Support/Admin-gated list endpoint
route.post('/admin/contact-messages/:messageId/notes', doubleCsrfProtection, Auth, isSupport, addInternalNote)
// this ticket's submitter's recent AI activity sir — same isSupport gate, view-only, no
// side effects, matches the "help" tier the rest of the ticket routes sit at
route.get('/admin/contact-messages/:messageId/user-activity', userActivityRules, validate, Auth, isSupport, getContactMessageUserActivity)

// saved filter views sir — personal to whoever created them, same isSupport gate as the
// list pages they apply to (a saved view is just a shortcut back into a page this role can
// already see, never a new capability)
route.get('/admin/saved-views', Auth, isSupport, getSavedViews)
route.post('/admin/saved-views', doubleCsrfProtection, createSavedViewRules, validate, Auth, isSupport, createSavedView)
route.delete('/admin/saved-views/:viewId', doubleCsrfProtection, deleteSavedViewRules, validate, Auth, isSupport, deleteSavedView)

// everything below is Admin only sir — either destructive (ban/unban/role change), a
// site-wide write (announcements), or oversight OF admins themselves (audit log/analytics)
route.get('/admin/analytics', Auth, isAdmin, getAdminAnalytics)
// unique-visitor/traffic dashboard sir — reads raw ipHash rows, Admin only (not Support)
// same bar as analytics/audit above
route.get('/admin/traffic', Auth, isAdmin, getTraffic)
// Billing OR Admin sir — see canRefund in Middlewares/Auth.js
route.patch('/admin/payments/:paymentId/refund', doubleCsrfProtection, Auth, canRefund, refundPayment)
route.patch('/admin/users/:userId/ban', doubleCsrfProtection, banUserRules, validate, Auth, isAdmin, banUser)
route.patch('/admin/users/:userId/unban', doubleCsrfProtection, Auth, isAdmin, unbanUser)
route.patch('/admin/users/:userId/deny-appeal', doubleCsrfProtection, Auth, isAdmin, denyAppeal)
route.patch('/admin/users/:userId/role', doubleCsrfProtection, setRoleRules, validate, Auth, isAdmin, setRole)
// bulk variants sir — same Admin-only bar, registered before the frontend needs them since
// :userId above would never match the literal path "bulk-ban"/"bulk-role" anyway, but kept
// grouped here with their single-user counterparts for readability
route.patch('/admin/users/bulk-ban', doubleCsrfProtection, bulkBanUsersRules, validate, Auth, isAdmin, bulkBanUsers)
route.patch('/admin/users/bulk-role', doubleCsrfProtection, bulkSetRoleRules, validate, Auth, isAdmin, bulkSetRole)
route.get('/admin/audit', Auth, isAdmin, getAuditLog)
route.get('/admin/announcements', Auth, isAdmin, getAnnouncements)
route.post('/admin/announcements', doubleCsrfProtection, Auth, isAdmin, createAnnouncement)
route.patch('/admin/announcements/:id/deactivate', doubleCsrfProtection, Auth, isAdmin, deactivateAnnouncement)

module.exports = route
