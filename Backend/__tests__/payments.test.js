const crypto = require('crypto')
const request = require('supertest')
const app = require('../app.js')
const User = require('../Models/User')
const Payment = require('../Models/Payment')
const OTP = require('../Models/OTP')

const STRONG_PASSWORD = 'Str0ng!Passw0rd'

// same signup+login+CSRF dance as auth.test.js sir — payment routes are CSRF-protected the
// same way, and the CSRF secret is bound to req.cookies.token, so the token must be fetched
// AFTER login, not before (see auth.test.js's logout test for the same lesson)
const registerAndLogin = async (email) => {
    await OTP.create({ email, otp: '123456' })
    await request(app).post('/api/v1/Createuser').send({
        firstName: 'Pay', lastName: 'Test', email, password: STRONG_PASSWORD, otp: '123456',
    })

    const agent = request.agent(app)
    const loginRes = await agent.post('/api/v1/Login').send({ email, password: STRONG_PASSWORD })
    const token = loginRes.body.token
    const csrfRes = await agent.get('/api/v1/csrf-token')
    const csrfToken = csrfRes.body.csrfToken

    return { agent, token, csrfToken, userId: loginRes.body.user.id }
}

// same HMAC scheme controllers/Payment.js's verifyPayment computes sir — order_id|payment_id
// signed with RAZORPAY_KEY_SECRET (set in globalSetup.js to a well-formed fake value, never
// a real one; no real Razorpay API call happens anywhere in this file)
const signPayment = (orderId, paymentId) =>
    crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')

describe('Payments: verify signature + cancel subscription', () => {
    test('verifyPayment accepts a correctly-signed subscription upgrade', async () => {
        const { agent, token, csrfToken, userId } = await registerAndLogin('payverify@example.com')

        const orderId = 'order_test_1'
        const paymentId = 'pay_test_1'
        await Payment.create({ user: userId, plan: 'Pro', amount: 499, razorpayOrderId: orderId, status: 'created' })

        const res = await agent.post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${token}`)
            .set('x-csrf-token', csrfToken)
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signPayment(orderId, paymentId),
            })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.plan).toBe('Pro')

        const user = await User.findById(userId)
        expect(user.SubType).toBe('Pro')
        expect(user.Subscription).toBe(true)

        const payment = await Payment.findOne({ razorpayOrderId: orderId })
        expect(payment.status).toBe('paid')
    })

    test('verifyPayment rejects a tampered signature and marks the payment failed', async () => {
        const { agent, token, csrfToken, userId } = await registerAndLogin('badsig@example.com')

        const orderId = 'order_test_2'
        await Payment.create({ user: userId, plan: 'Pro', amount: 499, razorpayOrderId: orderId, status: 'created' })

        const res = await agent.post('/api/v1/payment/verify')
            .set('Authorization', `Bearer ${token}`)
            .set('x-csrf-token', csrfToken)
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: 'pay_test_2',
                razorpay_signature: 'not-a-real-signature',
            })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)

        const user = await User.findById(userId)
        expect(user.SubType).toBe('Basic') // untouched sir — the tampered signature must not upgrade anyone

        const payment = await Payment.findOne({ razorpayOrderId: orderId })
        expect(payment.status).toBe('failed')
    })

    test('cancelSubscription downgrades a paid user to Basic immediately', async () => {
        const { agent, token, csrfToken, userId } = await registerAndLogin('cancelme@example.com')

        await User.findByIdAndUpdate(userId, { SubType: 'Pro', Subscription: true, SubscriptionExpires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) })

        const res = await agent.post('/api/v1/payment/cancel')
            .set('Authorization', `Bearer ${token}`)
            .set('x-csrf-token', csrfToken)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)

        const user = await User.findById(userId)
        expect(user.SubType).toBe('Basic')
        expect(user.Subscription).toBe(false)
    })

    test('cancelSubscription rejects a user already on Basic', async () => {
        const { agent, token, csrfToken } = await registerAndLogin('alreadybasic@example.com')

        const res = await agent.post('/api/v1/payment/cancel')
            .set('Authorization', `Bearer ${token}`)
            .set('x-csrf-token', csrfToken)

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })
})
