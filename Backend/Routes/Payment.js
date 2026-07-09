const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { createOrder, getPlans } = require('../controllers/Payment.js')

route.get('/payment/plans', getPlans)
route.post('/payment/order', Auth, createOrder)

module.exports = route
