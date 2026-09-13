const Razorpay = require('razorpay')

// stub-friendly sir — instance is only created if real keys are present in .env
// until then controllers/Payment.js returns a "coming soon" response instead of calling this
const isConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

const instance = isConfigured
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    : null

module.exports = { instance, isConfigured }
