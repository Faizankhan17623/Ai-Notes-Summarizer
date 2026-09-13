const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { authLimiter } = require('../Middlewares/RateLimit.js')
const {
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    AuthPendingTwoFactor,
    verifyTwoFactor,
} = require('../controllers/TwoFactor.js')

// account-settings actions sir — same Auth/blockIfBanned/CSRF gate as every other
// self-service account route (Backend/Routes/Auth.js's /profile/* block)
route.get('/2fa/setup', Auth, blockIfBanned, setupTwoFactor)
route.post('/2fa/enable', doubleCsrfProtection, Auth, blockIfBanned, enableTwoFactor)
route.post('/2fa/disable', doubleCsrfProtection, Auth, blockIfBanned, disableTwoFactor)

// login-flow continuation sir — NOT behind Auth (there's no full session yet, that's the
// entire point), gated by AuthPendingTwoFactor instead (checks the tempToken's purpose
// claim). authLimiter for the same brute-force reasoning as /Login itself — a 6-digit TOTP
// code has far fewer possibilities than a password, this needs the rate limit more, not less.
route.post('/2fa/verify', authLimiter, AuthPendingTwoFactor, verifyTwoFactor)

module.exports = route
