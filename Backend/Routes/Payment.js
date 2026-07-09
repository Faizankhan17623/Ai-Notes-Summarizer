const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { createOrderRules, verifyPaymentRules } = require('../Middlewares/ValidationRules.js')
const { createOrder, verifyPayment, getPlans } = require('../controllers/Payment.js')

route.get('/payment/plans', getPlans)
route.post('/payment/order', doubleCsrfProtection, createOrderRules, validate, Auth, createOrder)
route.post('/payment/verify', doubleCsrfProtection, verifyPaymentRules, validate, Auth, verifyPayment)

module.exports = route
