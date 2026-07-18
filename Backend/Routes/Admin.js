const express = require('express')
const route = express.Router()
const { Auth, isAdmin, isSupport } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { banUserRules, setRoleRules } = require('../Middlewares/ValidationRules.js')
const {
    getOverview,
    getAdminAnalytics,
    getUsers,
    banUser,
    unbanUser,
    setRole,
    getPayments,
    getAuditLog,
    getAiLogs,
    getActiveAnnouncement,
    getAnnouncements,
    createAnnouncement,
    deactivateAnnouncement,
} = require('../controllers/Admin.js')
const { getContactMessages } = require('../controllers/Contact.js')

// public sir — the frontend banner reads this on every page, no login required
route.get('/announcements/active', getActiveAnnouncement)

// read-only "view/help" routes sir — Support AND Admin both pass, nothing here can ban,
// change roles, or post site-wide, so it's safe for Support to have on their own
route.get('/admin/overview', Auth, isSupport, getOverview)
route.get('/admin/users', Auth, isSupport, getUsers)
route.get('/admin/payments', Auth, isSupport, getPayments)
route.get('/admin/ai-logs', Auth, isSupport, getAiLogs)
route.get('/admin/contact-messages', Auth, isSupport, getContactMessages)

// everything below is Admin only sir — either destructive (ban/unban/role change), a
// site-wide write (announcements), or oversight OF admins themselves (audit log/analytics)
route.get('/admin/analytics', Auth, isAdmin, getAdminAnalytics)
route.patch('/admin/users/:userId/ban', doubleCsrfProtection, banUserRules, validate, Auth, isAdmin, banUser)
route.patch('/admin/users/:userId/unban', doubleCsrfProtection, Auth, isAdmin, unbanUser)
route.patch('/admin/users/:userId/role', doubleCsrfProtection, setRoleRules, validate, Auth, isAdmin, setRole)
route.get('/admin/audit', Auth, isAdmin, getAuditLog)
route.get('/admin/announcements', Auth, isAdmin, getAnnouncements)
route.post('/admin/announcements', doubleCsrfProtection, Auth, isAdmin, createAnnouncement)
route.patch('/admin/announcements/:id/deactivate', doubleCsrfProtection, Auth, isAdmin, deactivateAnnouncement)

module.exports = route
