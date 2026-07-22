const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const cookie = require('cookie')

const ACCESS_TOKEN_TTL = '1h'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const isProd = process.env.NODE_ENV === 'production'
// frontend (Vercel) and backend (Render) are different sites in prod sir, so cross-site XHR
// needs SameSite=None (which requires Secure) or the browser silently drops the cookie on
// every request. Local dev is same-origin (localhost:5173 -> localhost:4000), where Lax is
// fine and None would needlessly require https. Same reasoning as controllers/user.js's own
// copy of this — kept here too since issueSessionCookies below needs it and this file has no
// dependency on user.js (avoids a require cycle).
const cookieSameSite = isProd ? 'none' : 'lax'

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

const signAccessToken = (user) =>
    jwt.sign(
        { id: user._id, firstName: user.firstName, lastName: user.lastName },
        process.env.JWT_PRIVATE_KEY,
        { expiresIn: ACCESS_TOKEN_TTL }
    )

const TEMP_TWO_FACTOR_TTL = '5m'

// a DIFFERENT, narrower token than signAccessToken above sir — carries `purpose: 'pending_2fa'`
// so Middlewares/Auth.js's normal Auth middleware (which only ever checks the JWT verifies,
// not its purpose claim) would still accept it as if it were a real session token if it
// somehow reached a normal route. controllers/TwoFactor.js's dedicated AuthPendingTwoFactor
// middleware is what actually enforces the purpose check — this token is only ever meant to
// be handed to POST /2fa/verify, nothing else. 5 minutes is enough for someone to open their
// authenticator app and type a code, short enough to bound the window if it leaked somehow.
const signTempTwoFactorToken = (user) =>
    jwt.sign(
        { id: user._id, purpose: 'pending_2fa' },
        process.env.JWT_PRIVATE_KEY,
        { expiresIn: TEMP_TWO_FACTOR_TTL }
    )

// opaque random value sir — NOT a JWT, carries no claims, purely a DB lookup key,
// so there's nothing here for an attacker to forge even if they guessed the shape
const issueRefreshToken = () => crypto.randomBytes(48).toString('hex')

// the ONE place that mints a full logged-in session sir — used by both loginUser (password)
// and controllers/OAuth.js's callback (social), so a session created either way is identical:
// same short-lived access token + httpOnly cookie, same long-lived refresh token (only its
// hash persisted, mirroring apiKeyHash) + its own httpOnly cookie. Persists the user doc
// (mongoose document, not a plain object — caller must pass one with .save()) and sets both
// Set-Cookie headers on `res`. Returns the raw accessToken so the caller can also include it
// in a JSON body where one exists (password login's response; OAuth's /oauth/session below).
const issueSessionCookies = async (res, user) => {
    const accessToken = signAccessToken(user)
    const rawRefreshToken = issueRefreshToken()

    user.refreshTokenHash = hashToken(rawRefreshToken)
    user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    user.token = accessToken
    await user.save()

    const accessCookie = cookie.serialize('token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: cookieSameSite,
        maxAge: 60 * 60,
        path: '/',
    })
    const refreshCookie = cookie.serialize('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: cookieSameSite,
        maxAge: 7 * 24 * 60 * 60,
        path: '/api/v1',
    })

    res.setHeader('Set-Cookie', [accessCookie, refreshCookie])

    return accessToken
}

module.exports = {
    ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_MS, hashToken, signAccessToken, issueRefreshToken,
    issueSessionCookies, isProd, cookieSameSite, signTempTwoFactorToken,
}
