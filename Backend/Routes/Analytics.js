const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { getMyAnalytics } = require('../controllers/Analytics.js')

route.get('/analytics/me', Auth, getMyAnalytics)

module.exports = route
