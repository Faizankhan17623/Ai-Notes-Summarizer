const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_TTL = '1h'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

const signAccessToken = (user) =>
    jwt.sign(
        { id: user._id, firstName: user.firstName, lastName: user.lastName },
        process.env.JWT_PRIVATE_KEY,
        { expiresIn: ACCESS_TOKEN_TTL }
    )

// opaque random value sir — NOT a JWT, carries no claims, purely a DB lookup key,
// so there's nothing here for an attacker to forge even if they guessed the shape
const issueRefreshToken = () => crypto.randomBytes(48).toString('hex')

module.exports = { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_MS, hashToken, signAccessToken, issueRefreshToken }
