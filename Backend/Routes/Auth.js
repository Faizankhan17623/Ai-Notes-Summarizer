const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { authLimiter, otpLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const {
    registerRules,
    loginRules,
    sendOtpRules,
    forgotPasswordRules,
    resetPasswordRules,
    updatePasswordRules,
    updateFirstNameRules,
    updateLastNameRules,
    appealRules,
} = require('../Middlewares/ValidationRules.js')
const {
    createUser,
    loginUser,
    SendOtp,
    getProfile,
    updateFirstName,
    updateLastName,
    updateDigestPreference,
    updateDailyGoal,
    updateModelPreference,
    getModelCatalog,
    completeOnboarding,
    updatePassword,
    forgotPassword,
    resetPassword,
    deleteAccount,
    recoverAccount,
    refreshToken,
    logoutUser,
    appealBan,
} = require('../controllers/user.js')
const { generateApiKey, getApiKeyStatus, revokeApiKey } = require('../controllers/ApiKey.js')

// authLimiter stops brute-force sir, otpLimiter stops email spam — no CSRF on these, no
// session cookie exists yet at this point in the flow
route.post('/Send-otp', otpLimiter, sendOtpRules, validate, SendOtp)
route.post('/Createuser', authLimiter, registerRules, validate, createUser)
route.post('/Login', authLimiter, loginRules, validate, loginUser)
route.post('/forgot-password', authLimiter, forgotPasswordRules, validate, forgotPassword)
route.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword)

// no Auth middleware on refresh-token sir — the access token is expected to be expired already.
// no CSRF here either — it's often the first authenticated action in a fresh tab before a CSRF
// token has been fetched, and the httpOnly sameSite:'lax' refresh cookie is the real protection
route.post('/refresh-token', authLimiter, refreshToken)
// logout stays open to banned users sir — no reason to trap them in a session they can't leave
route.post('/logout', doubleCsrfProtection, Auth, logoutUser)

// banned users need this to submit their one-shot appeal sir — deliberately NOT behind
// blockIfBanned, everything else on this route file is
route.post('/appeal', doubleCsrfProtection, appealRules, validate, Auth, appealBan)

// the account page reads/writes everything from here sir. GET /profile stays open to banned
// users too — the locked dashboard reads isBanned/banReason/appealStatus from this same call
route.get('/profile', Auth, getProfile)
route.patch('/profile/first-name', doubleCsrfProtection, updateFirstNameRules, validate, Auth, blockIfBanned, updateFirstName)
route.patch('/profile/last-name', doubleCsrfProtection, updateLastNameRules, validate, Auth, blockIfBanned, updateLastName)
route.patch('/profile/digest-preference', doubleCsrfProtection, Auth, blockIfBanned, updateDigestPreference)
route.patch('/profile/daily-goal', doubleCsrfProtection, Auth, blockIfBanned, updateDailyGoal)
route.get('/profile/model-catalog', Auth, blockIfBanned, getModelCatalog)
route.patch('/profile/model', doubleCsrfProtection, Auth, blockIfBanned, updateModelPreference)
route.patch('/profile/onboarding-complete', doubleCsrfProtection, Auth, blockIfBanned, completeOnboarding)
route.patch('/profile/password', doubleCsrfProtection, updatePasswordRules, validate, Auth, blockIfBanned, updatePassword)
route.delete('/profile', doubleCsrfProtection, Auth, blockIfBanned, deleteAccount)
route.post('/profile/recover', doubleCsrfProtection, Auth, blockIfBanned, recoverAccount)

// Pro/ProMax API key management sir — the raw key itself is only ever returned by POST
route.get('/api-key', Auth, blockIfBanned, getApiKeyStatus)
route.post('/api-key', doubleCsrfProtection, Auth, blockIfBanned, generateApiKey)
route.delete('/api-key', doubleCsrfProtection, Auth, blockIfBanned, revokeApiKey)

module.exports = route
