const request = require('supertest')
const app = require('../app.js')
const User = require('../Models/User')
const OTP = require('../Models/OTP')

// creates a valid, unexpired OTP row directly sir — bypasses the real email send (mailSender
// no-ops with no SMTP env vars configured, confirmed in Backend/utils/Nodemailer.js) so
// signup can be tested without an email provider
const seedOtp = async (email, otp = '123456') => {
    await OTP.create({ email, otp })
}

const STRONG_PASSWORD = 'Str0ng!Passw0rd'

describe('Auth: signup + login + lockout', () => {
    test('signup succeeds with a valid OTP', async () => {
        await seedOtp('newuser@example.com')

        const res = await request(app).post('/api/v1/Createuser').send({
            firstName: 'New',
            lastName: 'User',
            email: 'newuser@example.com',
            password: STRONG_PASSWORD,
            otp: '123456',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)

        const user = await User.findOne({ email: 'newuser@example.com' })
        expect(user).not.toBeNull()
        expect(user.Verified).toBe(true)
    })

    test('signup fails with a wrong OTP', async () => {
        await seedOtp('wrongotp@example.com')

        const res = await request(app).post('/api/v1/Createuser').send({
            firstName: 'Wrong',
            lastName: 'Otp',
            email: 'wrongotp@example.com',
            password: STRONG_PASSWORD,
            otp: '999999',
        })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        const user = await User.findOne({ email: 'wrongotp@example.com' })
        expect(user).toBeNull()
    })

    test('signup fails on a weak password', async () => {
        await seedOtp('weakpass@example.com')

        const res = await request(app).post('/api/v1/Createuser').send({
            firstName: 'Weak',
            lastName: 'Pass',
            email: 'weakpass@example.com',
            password: 'short',
            otp: '123456',
        })

        expect(res.status).toBe(400)
    })

    const createLoginableUser = async (email) => {
        await seedOtp(email)
        await request(app).post('/api/v1/Createuser').send({
            firstName: 'Login',
            lastName: 'Test',
            email,
            password: STRONG_PASSWORD,
            otp: '123456',
        })
    }

    test('login succeeds with the right password and sets session cookies', async () => {
        const email = 'logintest@example.com'
        await createLoginableUser(email)

        const res = await request(app).post('/api/v1/Login').send({ email, password: STRONG_PASSWORD })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.token).toEqual(expect.any(String))
        expect(res.body.user.email).toBe(email)

        const cookies = res.headers['set-cookie'] || []
        expect(cookies.some((c) => c.startsWith('token='))).toBe(true)
        expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true)
    })

    test('login fails with the wrong password and increments failedLoginAttempts', async () => {
        const email = 'wrongpw@example.com'
        await createLoginableUser(email)

        const res = await request(app).post('/api/v1/Login').send({ email, password: 'TotallyWrong1!' })

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)

        const user = await User.findOne({ email })
        expect(user.failedLoginAttempts).toBe(1)
    })

    test('account locks after 5 failed attempts and returns 423 while locked', async () => {
        const email = 'lockout@example.com'
        await createLoginableUser(email)

        for (let i = 0; i < 5; i++) {
            await request(app).post('/api/v1/Login').send({ email, password: 'WrongPassword1!' })
        }

        const user = await User.findOne({ email })
        expect(user.lockUntil).not.toBeNull()
        expect(user.lockUntil.getTime()).toBeGreaterThan(Date.now())

        // a 6th attempt, even with the CORRECT password, should be rejected while locked sir
        const res = await request(app).post('/api/v1/Login').send({ email, password: STRONG_PASSWORD })
        expect(res.status).toBe(423)
    })

    test('logout clears the refresh-token session', async () => {
        const email = 'logouttest@example.com'
        await createLoginableUser(email)

        // an agent so cookies persist across calls sir. The CSRF secret is bound to
        // req.cookies.token (Middlewares/Csrf.js getSessionIdentifier) — which doesn't exist
        // yet before login — so the CSRF token must be (re)fetched AFTER login, exactly like
        // the real frontend does (LoginUser dispatches FetchCsrfToken() in its success branch)
        const agent = request.agent(app)

        const loginRes = await agent.post('/api/v1/Login').send({ email, password: STRONG_PASSWORD })
        const token = loginRes.body.token

        const csrfRes = await agent.get('/api/v1/csrf-token')
        const csrfToken = csrfRes.body.csrfToken

        const before = await User.findOne({ email })
        expect(before.refreshTokenHash).not.toBeNull()

        await agent.post('/api/v1/logout')
            .set('Authorization', `Bearer ${token}`)
            .set('x-csrf-token', csrfToken)

        const after = await User.findOne({ email })
        expect(after.refreshTokenHash).toBeNull()
    })
})
