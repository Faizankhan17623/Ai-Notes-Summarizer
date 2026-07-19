const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { visitLimiter } = require('../Middlewares/RateLimit.js')
const { getMyAnalytics } = require('../controllers/Analytics.js')
const { logVisit } = require('../controllers/Visit.js')

route.get('/analytics/me', Auth, blockIfBanned, getMyAnalytics)

// public sir — the frontend pings this on every page load/navigation to power the admin
// traffic dashboard; no auth required, attribution to a user happens best-effort inside
route.post('/visit', visitLimiter, logVisit)

module.exports = route
