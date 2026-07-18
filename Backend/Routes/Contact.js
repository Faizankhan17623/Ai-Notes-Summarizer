const express = require('express')
const route = express.Router()
const { contactLimiter } = require('../Middlewares/RateLimit.js')
const { contactRules } = require('../Middlewares/ValidationRules.js')
const { validate } = require('../Middlewares/Validate.js')
const { submitContactMessage } = require('../controllers/Contact.js')

// public sir — no account exists yet for most people reaching out this way
route.post('/contact', contactLimiter, contactRules, validate, submitContactMessage)

module.exports = route
