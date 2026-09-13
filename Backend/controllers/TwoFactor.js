const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const otplib = require('otplib')
const QRCode = require('qrcode')

const User = require('../Models/User')
const { hashToken, issueSessionCookies } = require('../utils/RefreshToken.js')

const ISSUER = 'Notewise'
const BACKUP_CODE_COUNT = 8

// human-friendly one-time recovery codes sir — e.g. "F3K9-7XQP", easier to write down/read
// aloud than a raw hex string. Only the SHA-256 hash is ever persisted (same hashToken helper
// the refresh token uses); the plaintext codes are returned exactly once, at /2fa/enable time.
const generateBackupCode = () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8)
    return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

// GET /2fa/setup sir — Auth-gated. Generates a FRESH secret every call and returns it plus a
// QR code data URL, but does NOT persist anything yet — the secret only gets saved once
// /2fa/enable proves the user actually scanned it and can produce a valid code. Calling
// /setup twice in a row before /enable just invalidates the first QR (nothing was saved), no
// partial state to clean up.
exports.setupTwoFactor = async (req, res) => {
    try {
        const user = await User.findById(req.User.id).select('email twoFactorEnabled')
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found' })
        }
        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled' })
        }

        const secret = otplib.generateSecret()
        const uri = await otplib.generateURI({ issuer: ISSUER, label: user.email, secret, algorithm: 'sha1' })
        const qrDataUrl = await QRCode.toDataURL(uri)

        // the secret is handed back to the client here sir, NOT persisted — /2fa/enable's body
        // carries it back alongside the confirmation code so this endpoint stays side-effect-free
        return res.status(200).json({ success: true, secret, qrDataUrl })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to start two-factor setup' })
    }
}

// POST /2fa/enable sir — Auth-gated. body: { secret, code } — secret is the one /setup just
// handed back (round-tripped by the client, not re-derived server-side, since nothing was
// persisted at /setup time), code is what the user's authenticator app is showing right now.
// Only on a valid code does this actually turn 2FA on and persist the secret.
exports.enableTwoFactor = async (req, res) => {
    try {
        const { secret, code } = req.body
        if (!secret || !code) {
            return res.status(400).json({ success: false, message: 'A secret and code are required' })
        }

        const user = await User.findById(req.User.id).select('twoFactorEnabled')
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found' })
        }
        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled' })
        }

        const result = await otplib.verify({ token: String(code), secret })
        if (!result?.valid) {
            return res.status(400).json({ success: false, message: 'That code is incorrect or expired, please try again' })
        }

        const plainBackupCodes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode)

        await User.findByIdAndUpdate(req.User.id, {
            twoFactorEnabled: true,
            totpSecret: secret,
            twoFactorBackupCodes: plainBackupCodes.map(hashToken),
        })

        // shown to the user exactly once sir — never retrievable again after this response,
        // same one-shot-reveal principle as the API key feature and the refresh token
        return res.status(200).json({
            success: true,
            message: 'Two-factor authentication is now enabled',
            backupCodes: plainBackupCodes,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to enable two-factor authentication' })
    }
}

// POST /2fa/disable sir — Auth-gated. Re-confirms the password before turning off a security
// feature — same reasoning as requiring the current password anywhere else something
// security-relevant changes, so a hijacked-but-still-logged-in session can't silently
// downgrade the account's own protection.
exports.disableTwoFactor = async (req, res) => {
    try {
        const { password } = req.body
        if (!password) {
            return res.status(400).json({ success: false, message: 'Your password is required to disable two-factor authentication' })
        }

        const user = await User.findById(req.User.id).select('password twoFactorEnabled')
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found' })
        }
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled' })
        }

        const matches = user.password && await bcrypt.compare(password, user.password)
        if (!matches) {
            return res.status(401).json({ success: false, message: 'Incorrect password' })
        }

        await User.findByIdAndUpdate(req.User.id, {
            twoFactorEnabled: false,
            totpSecret: null,
            twoFactorBackupCodes: [],
        })

        return res.status(200).json({ success: true, message: 'Two-factor authentication has been disabled' })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to disable two-factor authentication' })
    }
}

// middleware for POST /2fa/verify sir — deliberately NOT the normal Auth middleware. Only
// accepts a token with purpose:'pending_2fa' (see utils/RefreshToken.js signTempTwoFactorToken),
// so a normal full-session access token can't be used here, and this token can't be used on
// any normal Auth-gated route either (those don't check `purpose` today, but this token's 5-
// minute TTL and single intended use keep the blast radius small even so).
exports.AuthPendingTwoFactor = (req, res, next) => {
    try {
        const { tempToken } = req.body
        if (!tempToken) {
            return res.status(401).json({ success: false, message: 'Missing verification token, please log in again' })
        }

        const decoded = jwt.verify(tempToken, process.env.JWT_PRIVATE_KEY)
        if (decoded.purpose !== 'pending_2fa') {
            return res.status(401).json({ success: false, message: 'Invalid verification token, please log in again' })
        }

        req.pendingUserId = decoded.id
        next()
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Verification session expired, please log in again' })
    }
}

// POST /2fa/verify sir — the second half of a 2FA login. body: { tempToken, code } — code can
// be either a live TOTP code OR one of the one-time backup codes (format "XXXX-XXXX"), tried
// in that order. On success, mints a full session exactly like a normal password login would
// (same issueSessionCookies helper loginUser/OAuth's callback already share).
exports.verifyTwoFactor = async (req, res) => {
    try {
        const { code } = req.body
        if (!code) {
            return res.status(400).json({ success: false, message: 'A code is required' })
        }

        const user = await User.findById(req.pendingUserId)
        if (!user || !user.twoFactorEnabled) {
            return res.status(404).json({ success: false, message: 'Account not found or two-factor is not enabled' })
        }

        const totpResult = await otplib.verify({ token: String(code), secret: user.totpSecret })

        if (totpResult?.valid) {
            const accessToken = await issueSessionCookies(res, user)
            return res.status(200).json({
                success: true,
                message: 'Logged in successfully',
                token: accessToken,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    SubType: user.SubType,
                    isBanned: user.isBanned,
                    banReason: user.banReason,
                    appealStatus: user.appealStatus,
                },
            })
        }

        // not a valid live code sir — try it as a one-time backup code instead
        const hashedAttempt = hashToken(code.trim().toUpperCase())
        const matchIndex = user.twoFactorBackupCodes.indexOf(hashedAttempt)
        if (matchIndex === -1) {
            return res.status(400).json({ success: false, message: 'That code is incorrect or expired, please try again' })
        }

        // consumed sir — a backup code works exactly once, then it's gone
        user.twoFactorBackupCodes.splice(matchIndex, 1)
        const accessToken = await issueSessionCookies(res, user)

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully with a backup code',
            token: accessToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                SubType: user.SubType,
                isBanned: user.isBanned,
                banReason: user.banReason,
                appealStatus: user.appealStatus,
            },
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to verify your code' })
    }
}
