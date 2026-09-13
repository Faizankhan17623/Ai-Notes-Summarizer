const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { getNotifications, markNotificationRead, markAllNotificationsRead, streamNotifications } = require('../controllers/Notification.js')

route.get('/notifications', Auth, blockIfBanned, getNotifications)
// SSE sir — pushes new notifications live, see controllers/Notification.js for the full reasoning
route.get('/notifications/stream', Auth, blockIfBanned, streamNotifications)
route.patch('/notifications/read-all', doubleCsrfProtection, Auth, blockIfBanned, markAllNotificationsRead)
route.patch('/notifications/:id/read', doubleCsrfProtection, Auth, blockIfBanned, markNotificationRead)

module.exports = route
