const mongoose = require('mongoose')

// one row per checkout attempt sir — real rows only start flowing once Razorpay keys are added,
// see utils/Razorpay.js and controllers/Payment.js for the current "coming soon" stub
const paymentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        plan: {
            type: String,
            enum: ['Pro', 'ProMax'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        razorpayOrderId: {
            type: String,
        },
        razorpayPaymentId: {
            type: String,
        },
        status: {
            type: String,
            enum: ['created', 'paid', 'failed'],
            default: 'created',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Payment', paymentSchema)
