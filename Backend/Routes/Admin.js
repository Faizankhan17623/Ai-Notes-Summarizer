const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport, canRefund } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { banUserRules, deleteUserRules, setRoleRules, bulkBanUsersRules, bulkDeleteUsersRules, bulkSetRoleRules, createSavedViewRules, deleteSavedViewRules, userActivityRules, messageIdParamRules, announcementIdParamRules } = require('../Middlewares/ValidationRules.js')
const {
    getOverview,
    getHealth,
    getAdminAnalytics,
    getUsers,
    suspendUser,
    directBanUser,
    unbanUser,
    denyAppeal,
    setRole,
    deleteUser,
    bulkSuspendUsers,
    bulkDirectBanUsers,
    bulkDeleteUsers,
    bulkSetRole,
    getPayments,
    refundPayment,
    getAuditLog,
    getAiLogs,
    getActiveAnnouncement,
    getAnnouncements,
    createAnnouncement,
    editAnnouncement,
    deactivateAnnouncement,
    deleteAnnouncement,
    getTraffic,
    getSavedViews,
    createSavedView,
    deleteSavedView,
    getContactMessageUserActivity,
} = require('../controllers/Admin.js')
const { getContactMessages, replyToContactMessage, addInternalNote } = require('../controllers/Contact.js')
const { getFeedbackReports, replyToFeedbackReport, addFeedbackNote } = require('../controllers/Feedback.js')
const { feedbackReplyRules } = require('../Middlewares/ValidationRules.js')

// public sir — the frontend banner reads this on every page, no login required
route.get('/announcements/active', getActiveAnnouncement)

// read-only "view/help" routes sir — Support AND Admin both pass, nothing here can ban,
// change roles, or post site-wide, so it's safe for Support to have on their own
route.get('/admin/overview', Auth, isSupport, getOverview)
route.get('/admin/health', Auth, isSupport, getHealth)
route.get('/admin/users', Auth, isSupport, getUsers)
route.get('/admin/payments', Auth, isSupport, getPayments)
route.get('/admin/ai-logs', Auth, isSupport, getAiLogs)
route.get('/admin/contact-messages', Auth, isSupport, getContactMessages)
// replying/resolving a ticket is exactly the "help" action Support exists for sir — no
// destructive/site-wide effect, so this stays isSupport too, not isAdmin
route.post('/admin/contact-messages/:messageId/reply', doubleCsrfProtection, messageIdParamRules, validate, Auth, isSupport, replyToContactMessage)
// private handoff notes sir — same isSupport gate as reply above, never visible to the
// submitter, only ever read back through this same Support/Admin-gated list endpoint
route.post('/admin/contact-messages/:messageId/notes', doubleCsrfProtection, messageIdParamRules, validate, Auth, isSupport, addInternalNote)
// this ticket's submitter's recent AI activity sir — same isSupport gate, view-only, no
// side effects, matches the "help" tier the rest of the ticket routes sit at
route.get('/admin/contact-messages/:messageId/user-activity', userActivityRules, validate, Auth, isSupport, getContactMessageUserActivity)

// bug reports / feature suggestions sir — same isSupport "view/help" tier as the contact-
// message routes right above; replying/resolving is the help action, nothing destructive here
route.get('/admin/feedback', Auth, isSupport, getFeedbackReports)
route.post('/admin/feedback/:reportId/reply', doubleCsrfProtection, feedbackReplyRules, validate, Auth, isSupport, replyToFeedbackReport)
route.post('/admin/feedback/:reportId/notes', doubleCsrfProtection, Auth, isSupport, addFeedbackNote)

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
// Support OR Admin sir — see canRefund in Middlewares/Auth.js
route.patch('/admin/payments/:paymentId/refund', doubleCsrfProtection, Auth, canRefund, refundPayment)
// suspend (2-strike, appealable) vs ban (instant, permanent) are two separate actions sir —
// see their comments in controllers/Admin.js and suspensionCount's comment in Models/User.js
route.patch('/admin/users/:userId/suspend', doubleCsrfProtection, banUserRules, validate, Auth, isAdmin, suspendUser)
route.patch('/admin/users/:userId/ban', doubleCsrfProtection, banUserRules, validate, Auth, isAdmin, directBanUser)
route.patch('/admin/users/:userId/unban', doubleCsrfProtection, Auth, isAdmin, unbanUser)
route.patch('/admin/users/:userId/deny-appeal', doubleCsrfProtection, Auth, isAdmin, denyAppeal)
route.patch('/admin/users/:userId/role', doubleCsrfProtection, setRoleRules, validate, Auth, isAdmin, setRole)
route.delete('/admin/users/:userId', doubleCsrfProtection, deleteUserRules, validate, Auth, isAdmin, deleteUser)
// bulk variants sir — same Admin-only bar, registered before the frontend needs them since
// :userId above would never match the literal path "bulk-suspend"/"bulk-ban"/"bulk-role"/
// "bulk-delete" anyway, but kept grouped here with their single-user counterparts for readability
route.patch('/admin/users/bulk-suspend', doubleCsrfProtection, bulkBanUsersRules, validate, Auth, isAdmin, bulkSuspendUsers)
route.patch('/admin/users/bulk-ban', doubleCsrfProtection, bulkBanUsersRules, validate, Auth, isAdmin, bulkDirectBanUsers)
route.patch('/admin/users/bulk-role', doubleCsrfProtection, bulkSetRoleRules, validate, Auth, isAdmin, bulkSetRole)
route.delete('/admin/users/bulk-delete', doubleCsrfProtection, bulkDeleteUsersRules, validate, Auth, isAdmin, bulkDeleteUsers)
route.get('/admin/audit', Auth, isAdmin, getAuditLog)
route.get('/admin/announcements', Auth, isAdmin, getAnnouncements)
route.post('/admin/announcements', doubleCsrfProtection, Auth, isAdmin, createAnnouncement)
route.patch('/admin/announcements/:id', doubleCsrfProtection, announcementIdParamRules, validate, Auth, isAdmin, editAnnouncement)
route.patch('/admin/announcements/:id/deactivate', doubleCsrfProtection, announcementIdParamRules, validate, Auth, isAdmin, deactivateAnnouncement)
route.delete('/admin/announcements/:id', doubleCsrfProtection, announcementIdParamRules, validate, Auth, isAdmin, deleteAnnouncement)

module.exports = route
