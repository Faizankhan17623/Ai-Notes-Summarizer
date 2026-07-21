const crypto = require('crypto')
const { instance, isConfigured } = require('../utils/Razorpay')
const Payment = require('../Models/Payment')
const User = require('../Models/User')
const { PLANS, CREDIT_PACKS, MODEL_CATALOG } = require('../utils/Plans')

// price table sir — only used once Razorpay keys are actually configured
const PRICE_INR = {
    Pro: 499,
    // dropped from 1499 sir — priced down alongside the 2026-07 change from unlimited
    // to 500 credits/mo (see utils/Plans.js); ~Rs2/credit vs Pro's ~Rs5/credit
    ProMax: 999,
}

// POST /payment/order — creates a Razorpay order sir, or a friendly stub response until real keys are added
// accepts EITHER { plan } (existing subscription upgrade flow) OR { packKey } (one-time credit top-up)
exports.createOrder = async (req, res) => {
    try {
        // Admin accounts are internal/staff accounts sir — they shouldn't be spending real
        // money through the app, so purchases are blocked at the point of order creation
        if (req.User.role === 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin accounts cannot make purchases',
            })
        }

        const { plan, packKey } = req.body

        let amount, paymentDoc

        if (packKey) {
            const pack = CREDIT_PACKS[packKey]
            if (!pack) {
                return res.status(400).json({
                    success: false,
                    message: 'A valid credit pack is required',
                })
            }

            // no live keys yet sir — tell the frontend plainly instead of pretending to charge anyone
            if (!isConfigured) {
                return res.status(503).json({
                    success: false,
                    message: 'Payments are coming soon — top-ups are not live yet, please check back later',
                })
            }

            amount = pack.priceInr * 100 // paise sir
            paymentDoc = {
                user: req.User.id,
                plan: 'CreditPack',
                amount: pack.priceInr,
                creditsGranted: pack.credits,
                status: 'created',
            }
        } else {
            if (!plan || !['Pro', 'ProMax'].includes(plan)) {
                return res.status(400).json({
                    success: false,
                    message: 'A valid plan (Pro or ProMax) is required',
                })
            }

            if (!isConfigured) {
                return res.status(503).json({
                    success: false,
                    message: 'Payments are coming soon — upgrades are not live yet, please check back later',
                })
            }

            amount = PRICE_INR[plan] * 100 // paise sir
            paymentDoc = {
                user: req.User.id,
                plan,
                amount: PRICE_INR[plan],
                status: 'created',
            }
        }

        // Razorpay caps receipt at 40 chars sir — the user/plan link already lives on the
        // Payment document itself, so the receipt only needs to be short and unique
        const order = await instance.orders.create({
            amount,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
        })

        paymentDoc.razorpayOrderId = order.id
        await Payment.create(paymentDoc)

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

// POST /payment/verify — called by the frontend right after Razorpay's Checkout.js succeeds sir
// verifies the HMAC signature so we KNOW this callback genuinely came from Razorpay (never trust
// the client's word alone that a payment succeeded — that's the entire point of this endpoint)
// then upgrades the user's plan for 30 days
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification fields',
            })
        }

        if (!isConfigured) {
            return res.status(503).json({
                success: false,
                message: 'Payments are not live yet',
            })
        }

        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.User.id })
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No matching order found for this payment',
            })
        }

        // the HMAC check sir — this is the actual proof the payment is real, not just a client claim
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (expectedSignature !== razorpay_signature) {
            payment.status = 'failed'
            await payment.save()
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed — signature mismatch',
            })
        }

        payment.status = 'paid'
        payment.razorpayPaymentId = razorpay_payment_id
        await payment.save()

        // credit-pack purchase sir — grants bonus credits only, never touches the subscription tier
        if (payment.plan === 'CreditPack') {
            const updated = await User.findByIdAndUpdate(
                req.User.id,
                { $inc: { bonusCredits: payment.creditsGranted } },
                { returnDocument: 'after' }
            ).select('bonusCredits')

            return res.status(200).json({
                success: true,
                message: `${payment.creditsGranted} credits added to your account`,
                creditsGranted: payment.creditsGranted,
                bonusCredits: updated.bonusCredits,
            })
        }

        // 30-day upgrade sir — a renewal before expiry just extends from now, matching how most subscriptions feel to a user
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        await User.findByIdAndUpdate(req.User.id, {
            SubType: payment.plan,
            Subscription: true,
            SubscriptionExpires: expiresAt,
            // credit cycle realigns to the fresh subscription sir — SubscriptionExpires is already
            // bumped unconditionally on every payment, the credit cycle shouldn't lag behind it.
            // bonusCredits is intentionally untouched — an upgrade shouldn't wipe out top-up
            // credits already paid for separately, only the lazy cycle rollover clears those.
            // per-feature counters reset alongside count sir — same fresh-cycle reasoning
            count: 0,
            docSummaryCount: 0,
            bulkSummaryCount: 0,
            audioSummaryCount: 0,
            creditCycleStart: new Date(),
            // fresh SubscriptionExpires means the old expiry warning no longer applies sir —
            // re-arms utils/PlanExpiryJob.js for whenever THIS expiry eventually approaches
            planExpiryNotified: false,
        })

        return res.status(200).json({
            success: true,
            message: `Upgraded to ${payment.plan} successfully`,
            plan: payment.plan,
            expiresAt,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while verifying the payment',
        })
    }
}

// GET /payment/history — the logged-in user's own purchase history sir, most recent first.
// only 'paid' rows are shown — 'created'/'failed' rows are checkout attempts the user never
// actually completed, and would just be confusing clutter in a receipts list
exports.getPaymentHistory = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.User.id, status: 'paid' })
            .sort({ createdAt: -1 })
            .select('plan amount creditsGranted currency status createdAt')

        return res.status(200).json({ success: true, payments })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to load purchase history',
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
            // model NAMES only sir — the Pricing page is public/pre-login, no preferredModel
            // to resolve here, just "what's on offer" for this tier (see MODEL_CATALOG)
            models: (MODEL_CATALOG[p.key] || []).map((m) => m.label.replace(' (default)', '')),
        })),
        creditPacks: Object.values(CREDIT_PACKS),
        paymentsLive: isConfigured,
    })
}
