const { instance, isConfigured } = require('../utils/Razorpay')
const Payment = require('../Models/Payment')
const { PLANS } = require('../utils/Plans')

// price table sir — only used once Razorpay keys are actually configured
const PRICE_INR = {
    Pro: 499,
    ProMax: 1499,
}

// POST /payment/order — creates a Razorpay order sir, or a friendly stub response until real keys are added
exports.createOrder = async (req, res) => {
    try {
        const { plan } = req.body

        if (!plan || !['Pro', 'ProMax'].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'A valid plan (Pro or ProMax) is required',
            })
        }

        // no live keys yet sir — tell the frontend plainly instead of pretending to charge anyone
        if (!isConfigured) {
            return res.status(503).json({
                success: false,
                message: 'Payments are coming soon — upgrades are not live yet, please check back later',
            })
        }

        const amount = PRICE_INR[plan] * 100 // paise sir

        const order = await instance.orders.create({
            amount,
            currency: 'INR',
            receipt: `receipt_${req.User.id}_${Date.now()}`,
        })

        await Payment.create({
            user: req.User.id,
            plan,
            amount: PRICE_INR[plan],
            razorpayOrderId: order.id,
            status: 'created',
        })

        return res.status(200).json({
            success: true,
            order,
            key: process.env.RAZORPAY_KEY_ID,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the order',
        })
    }
}

// GET /payment/plans — the public plan comparison table sir, always available even in stub mode
exports.getPlans = async (req, res) => {
    return res.status(200).json({
        success: true,
        plans: Object.values(PLANS).map((p) => ({
            ...p,
            priceInr: PRICE_INR[p.key] || 0,
        })),
        paymentsLive: isConfigured,
    })
}
