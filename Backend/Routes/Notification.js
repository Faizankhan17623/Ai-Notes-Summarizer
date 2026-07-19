const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { getNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/Notification.js')

route.get('/notifications', Auth, blockIfBanned, getNotifications)
route.patch('/notifications/read-all', doubleCsrfProtection, Auth, blockIfBanned, markAllNotificationsRead)
route.patch('/notifications/:id/read', doubleCsrfProtection, Auth, blockIfBanned, markNotificationRead)

module.exports = route
