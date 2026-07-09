const express = require('express')
const route = express.Router()
const { Calling } = require('../controllers/AI')
const { ApiKeyAuth } = require('../Middlewares/ApiKeyAuth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')

// the ONLY endpoint an API key can ever call sir — same controller as the dashboard's
// POST /summarize, just gated by ApiKeyAuth instead of the JWT/cookie Auth middleware
route.post('/external/summarize', aiLimiter, ApiKeyAuth, Calling)

module.exports = route
