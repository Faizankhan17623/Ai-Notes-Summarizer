const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { getNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/Notification.js')

route.get('/notifications', Auth, getNotifications)
route.patch('/notifications/read-all', doubleCsrfProtection, Auth, markAllNotificationsRead)
route.patch('/notifications/:id/read', doubleCsrfProtection, Auth, markNotificationRead)

module.exports = route
