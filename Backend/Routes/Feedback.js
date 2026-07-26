const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { feedbackLimiter } = require('../Middlewares/RateLimit.js')
const { feedbackReportRules } = require('../Middlewares/ValidationRules.js')
const { validate } = require('../Middlewares/Validate.js')
const { submitFeedbackReport } = require('../controllers/Feedback.js')

// logged-in only sir — unlike /contact (a pre-account public form), bug/feature reports
// are tied to a real account (submittedBy, in-app Notification on reply), and the
// screenshot upload accepts multipart/form-data — same CSRF-header approach the existing
// multipart /summarize route already relies on (see Middlewares/Csrf.js's comment), same
// middleware order as Routes/Notes.js's /summarize
route.post('/feedback/:type', feedbackLimiter, doubleCsrfProtection, feedbackReportRules, validate, Auth, blockIfBanned, submitFeedbackReport)

module.exports = route
