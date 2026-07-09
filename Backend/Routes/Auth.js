const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { authLimiter, otpLimiter } = require('../Middlewares/RateLimit.js')
const {
    createUser,
    loginUser,
    SendOtp,
    getProfile,
    updateFirstName,
    updateLastName,
    updatePassword,
    forgotPassword,
    resetPassword,
    deleteAccount,
    recoverAccount,
} = require('../controllers/user.js')

// authLimiter stops brute-force sir, otpLimiter stops email spam
route.post('/Send-otp', otpLimiter, SendOtp)
route.post('/Createuser', authLimiter, createUser)
route.post('/Login', authLimiter, loginUser)
route.post('/forgot-password', authLimiter, forgotPassword)
route.post('/reset-password', authLimiter, resetPassword)

// the account page reads/writes everything from here sir
route.get('/profile', Auth, getProfile)
route.patch('/profile/first-name', Auth, updateFirstName)
route.patch('/profile/last-name', Auth, updateLastName)
route.patch('/profile/password', Auth, updatePassword)
route.delete('/profile', Auth, deleteAccount)
route.post('/profile/recover', Auth, recoverAccount)

module.exports = route
