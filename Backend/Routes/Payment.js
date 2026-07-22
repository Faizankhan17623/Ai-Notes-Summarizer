const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { createOrderRules, verifyPaymentRules } = require('../Middlewares/ValidationRules.js')
const { createOrder, verifyPayment, getPlans, getPaymentHistory, cancelSubscription } = require('../controllers/Payment.js')

route.get('/payment/plans', getPlans)
route.get('/payment/history', Auth, blockIfBanned, getPaymentHistory)
route.post('/payment/order', doubleCsrfProtection, createOrderRules, validate, Auth, blockIfBanned, createOrder)
route.post('/payment/verify', doubleCsrfProtection, verifyPaymentRules, validate, Auth, blockIfBanned, verifyPayment)
route.post('/payment/cancel', doubleCsrfProtection, Auth, blockIfBanned, cancelSubscription)

module.exports = route
