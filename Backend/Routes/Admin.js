const express = require('express')
const route = express.Router()
const { Auth, isAdmin } = require('../Middlewares/Auth.js')
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

// public sir — the frontend banner reads this on every page, no login required
route.get('/announcements/active', getActiveAnnouncement)

// everything below is Admin only sir
route.get('/admin/overview', Auth, isAdmin, getOverview)
route.get('/admin/analytics', Auth, isAdmin, getAdminAnalytics)
route.get('/admin/users', Auth, isAdmin, getUsers)
route.patch('/admin/users/:userId/ban', doubleCsrfProtection, banUserRules, validate, Auth, isAdmin, banUser)
route.patch('/admin/users/:userId/unban', doubleCsrfProtection, Auth, isAdmin, unbanUser)
route.patch('/admin/users/:userId/role', doubleCsrfProtection, setRoleRules, validate, Auth, isAdmin, setRole)
route.get('/admin/payments', Auth, isAdmin, getPayments)
route.get('/admin/audit', Auth, isAdmin, getAuditLog)
route.get('/admin/ai-logs', Auth, isAdmin, getAiLogs)
route.get('/admin/announcements', Auth, isAdmin, getAnnouncements)
route.post('/admin/announcements', doubleCsrfProtection, Auth, isAdmin, createAnnouncement)
route.patch('/admin/announcements/:id/deactivate', doubleCsrfProtection, Auth, isAdmin, deactivateAnnouncement)

module.exports = route
