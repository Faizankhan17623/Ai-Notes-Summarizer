const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
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
    updatePassword,
    forgotPassword,
    resetPassword,
    deleteAccount,
    recoverAccount,
    refreshToken,
    logoutUser,
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
route.post('/logout', doubleCsrfProtection, Auth, logoutUser)

// the account page reads/writes everything from here sir
route.get('/profile', Auth, getProfile)
route.patch('/profile/first-name', doubleCsrfProtection, updateFirstNameRules, validate, Auth, updateFirstName)
route.patch('/profile/last-name', doubleCsrfProtection, updateLastNameRules, validate, Auth, updateLastName)
route.patch('/profile/digest-preference', doubleCsrfProtection, Auth, updateDigestPreference)
route.patch('/profile/daily-goal', doubleCsrfProtection, Auth, updateDailyGoal)
route.patch('/profile/password', doubleCsrfProtection, updatePasswordRules, validate, Auth, updatePassword)
route.delete('/profile', doubleCsrfProtection, Auth, deleteAccount)
route.post('/profile/recover', doubleCsrfProtection, Auth, recoverAccount)

// Pro/ProMax API key management sir — the raw key itself is only ever returned by POST
route.get('/api-key', Auth, getApiKeyStatus)
route.post('/api-key', doubleCsrfProtection, Auth, generateApiKey)
route.delete('/api-key', doubleCsrfProtection, Auth, revokeApiKey)

module.exports = route
