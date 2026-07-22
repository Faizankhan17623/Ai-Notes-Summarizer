const cookie = require('cookie')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const otpGenerator = require('otp-generator')
const crypto = require('crypto')

const User = require('../Models/User')
const OTP = require('../Models/OTP.js')
const Note = require('../Models/Note.js')
const Chat = require('../Models/Chat.js')
const Flashcard = require('../Models/Flashcard.js')
const Quiz = require('../Models/Quiz.js')
const mailSender = require('../utils/Nodemailer.js')

const { deleteAccountEmail } = require('../Templates/DeleteAccount.js')
const { passwordResetTemplate } = require('../Templates/passwordResetTemplate.js')
const { getEffectivePlan, resetCycleIfNeeded, MODEL_CATALOG } = require('../utils/Plans.js')
const { dayKey } = require('../utils/Streak.js')
const { isStrongPassword } = require('../utils/PasswordPolicy.js')
const { hashToken, signAccessToken, issueSessionCookies, signTempTwoFactorToken } = require('../utils/RefreshToken.js')
const { sampleNoteFields } = require('../utils/SampleNote.js')

// allowlist, not a blocklist, sir — '-password' alone still shipped refreshTokenHash,
// apiKeyHash, resetPasswordToken and other secret-adjacent fields back to the user's own
// browser on every profile update. Same field set getProfile below already uses, so every
// self-service update returns exactly the shape the frontend's setProfile/setUser expect.
const SAFE_USER_FIELDS = 'firstName lastName email role Verified Subscription SubType SubscriptionExpires ' +
    'count creditCycleStart bonusCredits docSummaryCount bulkSummaryCount audioSummaryCount receiveDigest ' +
    'currentStreak longestStreak dailyGoal hasCompletedOnboarding createdAt Buffer BufferTiming twoFactorEnabled'

const isProd = process.env.NODE_ENV === 'production'
// frontend (Vercel) and backend (Render) are different sites in prod sir, so cross-site XHR
// needs SameSite=None (which requires Secure) or the browser silently drops the cookie on
// every request. Local dev is same-origin (localhost:5173 -> localhost:4000), where Lax is
// fine and None would needlessly require https.
const cookieSameSite = isProd ? 'none' : 'lax'

// ============================================================
// SEND OTP
// ============================================================
exports.SendOtp = async (req, res) => {
    try {
        const { email } = req.body

        // not case sir
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            })
        }

        const checkUserPresent = await User.findOne({ email })
        if (checkUserPresent) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists',
            })
        }

        let OtpCreate = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            digits: true,
            lowerCaseAlphabets: false
        })

        let result = await OTP.findOne({ otp: OtpCreate })

        while (result) {
            OtpCreate = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                specialChars: false,
                digits: true,
                lowerCaseAlphabets: false
            })
            result = await OTP.findOne({ otp: OtpCreate })
        }

        const otpBody = await OTP.create({ email, otp: OtpCreate })

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
        })
    }
}

// ============================================================
// CREATE USER (Register)
// ============================================================
exports.createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, otp } = req.body

        // not case sir
        if (!firstName || !lastName || !email || !password || !otp) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            })
        }

        // strong password required sir — mirrors the frontend rule, enforced here too since
        // this endpoint can be hit directly, bypassing the form's client-side checks
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                field: 'password',
                message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character',
            })
        }

        const existingEmail = await User.findOne({ email })
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                field: 'email',
                message: 'A user with this email already exists',
            })
        }

        // grab the most recent otp for this email sir
        const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 })

        if (!recentOtp) {
            return res.status(400).json({
                success: false,
                field: 'otp',
                message: 'OTP not found, please request a new one',
            })
        }

        if (String(recentOtp.otp) !== String(otp)) {
            return res.status(400).json({
                success: false,
                field: 'otp',
                message: 'Invalid OTP, please try again',
            })
        }

        const saltRounds = 10
        const hashing = await bcrypt.hash(password, saltRounds)

        const Creation = await User.create({
            firstName,
            lastName,
            email,
            password: hashing,
            Verified: true
        })

        // sample note so first login isn't a blank dashboard sir — best-effort, never blocks
        // account creation if it fails for some reason
        Note.create({ user: Creation._id, ...sampleNoteFields() }).catch((err) =>
            console.log('Sample note creation failed:', err.message)
        )

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to create user',
        })
    }
}

// ============================================================
// LOGIN USER
// ============================================================
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            })
        }

        const existingUser = await User.findOne({ email })

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                field: 'email',
                message: 'No account found with this email',
            })
        }

        // banned users ARE allowed to log in sir — they land on a locked dashboard (see
        // DashboardLayout.jsx) that blocks every action but shows the ban reason and a
        // one-shot appeal form, instead of being turned away at the door with no way to
        // ever contest it. isBanned is still enforced per-route by blockIfBanned in Auth.js.

        // account-level brute-force lockout sir — separate from isBanned, self-healing, no admin
        // action needed. Checked BEFORE bcrypt.compare so a locked account never pays the bcrypt
        // cost and gets the identical response whether or not the password given was correct
        if (existingUser.lockUntil && existingUser.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((existingUser.lockUntil - Date.now()) / 60000)
            return res.status(423).json({
                success: false,
                message: `Too many failed attempts. This account is temporarily locked, try again in ${minutesLeft} minute(s)`,
            })
        }

        const Comparing = await bcrypt.compare(password, existingUser.password)

        if (!Comparing) {
            // 5 consecutive failures locks the account for 2 minutes sir — short enough that a
            // genuine owner who mistyped their password isn't locked out for long, still enough
            // friction to slow down a brute-force attempt. Separate from authLimiter's own
            // 15-minute/20-try IP-level window in RateLimit.js, which stays as the broader guard.
            const attempts = (existingUser.failedLoginAttempts || 0) + 1
            const update = { failedLoginAttempts: attempts }
            if (attempts >= 5) {
                update.lockUntil = new Date(Date.now() + 2 * 60 * 1000)
                update.failedLoginAttempts = 0
            }
            await User.findByIdAndUpdate(existingUser._id, update)

            return res.status(401).json({
                success: false,
                field: 'password',
                message: 'Incorrect password, please try again',
            })
        }

        // success sir — clear any accumulated failures/lock on the same doc that gets .save()-d below
        if (existingUser.failedLoginAttempts || existingUser.lockUntil) {
            existingUser.failedLoginAttempts = 0
            existingUser.lockUntil = null
        }

        // a soft-deleted account logging back in inside the buffer window is recovered automatically sir
        if (existingUser.Buffer) {
            existingUser.Buffer = false
            existingUser.BufferTiming = null
        }

        const { _id, firstName, lastName, role, SubType, isBanned, banReason, appealStatus } = existingUser

        // 2FA-enabled accounts don't get a full session yet sir — password is correct, but
        // that's only the FIRST factor. Persist the failedLoginAttempts/Buffer-recovery
        // clearing above (it's a real password-correct event) without minting cookies, and
        // hand back a short-lived pending token for POST /2fa/verify (controllers/TwoFactor.js)
        // to exchange for a real session once the TOTP/backup code checks out.
        if (existingUser.twoFactorEnabled) {
            await existingUser.save()
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                tempToken: signTempTwoFactorToken(existingUser),
            })
        }

        // short-lived access token + a separate long-lived refresh token sir — only the refresh
        // token's SHA-256 hash is stored (mirrors the existing apiKeyHash pattern), the raw value
        // lives only in its own httpOnly cookie, never in the JSON body or localStorage. Same
        // helper controllers/OAuth.js's callback uses, so a password login and a social login
        // mint an identical session.
        const accessToken = await issueSessionCookies(res, existingUser)

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            token: accessToken,
            user: {
                id: _id,
                firstName,
                lastName,
                email: existingUser.email,
                role,
                SubType,
                isBanned,
                banReason,
                appealStatus,
            }
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to login',
        })
    }
}

// ============================================================
// REFRESH TOKEN — silently mints a new access token from the httpOnly refresh cookie sir
// no Auth middleware here on purpose, the access token is expected to be expired/expiring
// ============================================================
exports.refreshToken = async (req, res) => {
    try {
        const raw = req.cookies?.refreshToken

        if (!raw) {
            return res.status(401).json({
                success: false,
                message: 'No refresh token, please log in again',
            })
        }

        const hashed = hashToken(raw)
        const user = await User.findOne({ refreshTokenHash: hashed })

        if (!user || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < Date.now()) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token invalid or expired, please log in again',
            })
        }

        // banned users keep refreshing sir — same reasoning as loginUser above, they need a
        // working session to reach the locked dashboard and submit their one-shot appeal

        const accessToken = signAccessToken(user)
        user.token = accessToken
        await user.save()

        const accessCookie = cookie.serialize('token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: cookieSameSite,
            maxAge: 60 * 60,
            path: '/',
        })
        res.setHeader('Set-Cookie', accessCookie)

        return res.status(200).json({
            success: true,
            token: accessToken,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to refresh session',
        })
    }
}

// ============================================================
// LOGOUT — clears both cookies and revokes the refresh token server-side sir
// ============================================================
exports.logoutUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.User.id, {
            refreshTokenHash: null,
            refreshTokenExpiresAt: null,
        })

        const clearAccess = cookie.serialize('token', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: cookieSameSite,
            maxAge: 0,
            path: '/',
        })
        const clearRefresh = cookie.serialize('refreshToken', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: cookieSameSite,
            maxAge: 0,
            path: '/api/v1',
        })
        res.setHeader('Set-Cookie', [clearAccess, clearRefresh])

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to log out',
        })
    }
}

// ============================================================
// UPDATE FIRST NAME
// ============================================================
exports.updateFirstName = async (req, res) => {
    try {
        const { firstName } = req.body

        if (!firstName) {
            return res.status(400).json({
                success: false,
                message: 'First name is required',
            })
        }

        const userId = req.User.id

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { firstName },
            { returnDocument: 'after' }
        ).select(SAFE_USER_FIELDS)

        return res.status(200).json({
            success: true,
            message: 'First name updated successfully',
            user: updatedUser,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update first name',
        })
    }
}

// ============================================================
// UPDATE DIGEST PREFERENCE
// ============================================================
exports.updateDigestPreference = async (req, res) => {
    try {
        const { receiveDigest } = req.body

        if (typeof receiveDigest !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'receiveDigest must be true or false',
            })
        }

        const userId = req.User.id

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { receiveDigest },
            { returnDocument: 'after' }
        ).select(SAFE_USER_FIELDS)

        return res.status(200).json({
            success: true,
            message: 'Digest preference updated successfully',
            user: updatedUser,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update digest preference',
        })
    }
}

// ============================================================
// UPDATE DAILY STUDY GOAL
// ============================================================
exports.updateDailyGoal = async (req, res) => {
    try {
        const { dailyGoal } = req.body

        if (typeof dailyGoal !== 'number' || !Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 50) {
            return res.status(400).json({
                success: false,
                message: 'dailyGoal must be a whole number between 1 and 50',
            })
        }

        const userId = req.User.id

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { dailyGoal },
            { returnDocument: 'after' }
        ).select(SAFE_USER_FIELDS)

        return res.status(200).json({
            success: true,
            message: 'Daily study goal updated',
            user: updatedUser,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update daily goal',
        })
    }
}

// ============================================================
// COMPLETE ONBOARDING — dismisses the checklist, whether by finishing all 3 steps or
// clicking "dismiss" manually. One-way sir — never flips back to false.
// ============================================================
exports.completeOnboarding = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.User.id,
            { hasCompletedOnboarding: true },
            { returnDocument: 'after' }
        ).select(SAFE_USER_FIELDS)

        return res.status(200).json({
            success: true,
            user: updatedUser,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update onboarding status',
        })
    }
}

// ============================================================
// UPDATE PREFERRED AI MODEL — Pro/ProMax perk sir, picks which Groq model powers this user's
// summaries/chats/flashcards/quizzes (see utils/Plans.js resolveModel). Basic has an empty
// catalog so this always 400s for them; the actual per-request enforcement still lives in
// resolveModel (so a downgrade after picking a model can't leave a stale privileged choice active)
// ============================================================
exports.updateModelPreference = async (req, res) => {
    try {
        const { model } = req.body
        const userId = req.User.id

        const user = await User.findById(userId).select('SubType SubscriptionExpires')
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found' })
        }

        const plan = getEffectivePlan(user)
        const allowed = MODEL_CATALOG[plan.key] || []

        // null clears the preference back to the plan default sir — a valid choice, not an error
        if (model !== null && !allowed.some((m) => m.id === model)) {
            return res.status(403).json({
                success: false,
                message: allowed.length === 0
                    ? 'Choosing a model requires a Pro or Pro Max plan'
                    : 'That model is not available on your current plan',
            })
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { preferredModel: model },
            { returnDocument: 'after' }
        ).select(SAFE_USER_FIELDS)

        return res.status(200).json({
            success: true,
            message: model ? 'Preferred model updated' : 'Reset to the default model',
            user: updatedUser,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update preferred model',
        })
    }
}

// GET /profile/model-catalog sir — the list of models this user's CURRENT plan can pick from,
// so the frontend dropdown never shows an option that would just 403
exports.getModelCatalog = async (req, res) => {
    try {
        const user = await User.findById(req.User.id).select('SubType SubscriptionExpires preferredModel')
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found' })
        }

        const plan = getEffectivePlan(user)
        return res.status(200).json({
            success: true,
            models: MODEL_CATALOG[plan.key] || [],
            preferredModel: user.preferredModel,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to load model catalog',
        })
    }
}

// ============================================================
// UPDATE LAST NAME
// ============================================================
exports.updateLastName = async (req, res) => {
    try {
        const { lastName } = req.body

        if (!lastName) {
            return res.status(400).json({
                success: false,
                message: 'Last name is required',
            })
        }

        const userId = req.User.id

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { lastName },
            { returnDocument: 'after' }
        ).select(SAFE_USER_FIELDS)

        return res.status(200).json({
            success: true,
            message: 'Last name updated successfully',
            user: updatedUser,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update last name',
        })
    }
}

// ============================================================
// UPDATE PASSWORD
// ============================================================
exports.updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmNewPassword } = req.body

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required',
            })
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                field: 'confirmNewPassword',
                message: 'New password and confirm password do not match',
            })
        }

        const userId = req.User.id
        const existingUser = await User.findById(userId)

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        const Comparing = await bcrypt.compare(oldPassword, existingUser.password)

        if (!Comparing) {
            return res.status(401).json({
                success: false,
                field: 'oldPassword',
                message: 'Password not matched',
            })
        }

        // new password must actually be new sir — a same-as-old "change" is almost always a
        // mistake (autofill, muscle memory), and every major app rejects it at this point
        const sameAsOld = await bcrypt.compare(newPassword, existingUser.password)
        if (sameAsOld) {
            return res.status(400).json({
                success: false,
                field: 'newPassword',
                message: 'New password must be different from your old password',
            })
        }

        const saltRounds = 10
        const hashing = await bcrypt.hash(newPassword, saltRounds)

        // changing the password kills any stolen refresh token too sir — same spirit as revoking
        // API keys elsewhere, a leaked refresh token shouldn't survive a password change
        await User.findByIdAndUpdate(userId, {
            password: hashing,
            refreshTokenHash: null,
            refreshTokenExpiresAt: null,
        })

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to update password',
        })
    }
}

// ============================================================
// FORGOT PASSWORD (send reset link via email)
// ============================================================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            })
        }

        const token = crypto.randomBytes(20).toString('hex')

        const user = await User.findOneAndUpdate(
            { email },
            {
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000,
            },
            { returnDocument: 'after' }
        )

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email',
            })
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        const url = `${frontendUrl}/reset-password/${token}`

        await mailSender(
            email,
            'Reset your password',
            passwordResetTemplate(`${user.firstName} ${user.lastName}`, url)
        )

        return res.status(200).json({
            success: true,
            message: 'Password reset email sent',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to send reset email',
        })
    }
}

// ============================================================
// RESET PASSWORD (via token from email)
// ============================================================
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmNewPassword } = req.body

        if (!token || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password fields are required',
            })
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password and confirm password do not match',
            })
        }

        const userDetails = await User.findOne({ resetPasswordToken: token })
        if (!userDetails) {
            return res.status(400).json({
                success: false,
                message: 'Token is invalid',
            })
        }

        if (!(userDetails.resetPasswordExpires > Date.now())) {
            return res.status(403).json({
                success: false,
                message: 'Token is expired, please request a new one',
            })
        }

        // same rule as the logged-in Change Password flow sir — see updatePassword above
        const sameAsOld = await bcrypt.compare(newPassword, userDetails.password)
        if (sameAsOld) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your old password',
            })
        }

        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        await User.findOneAndUpdate(
            { resetPasswordToken: token },
            {
                password: encryptedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                refreshTokenHash: null,
                refreshTokenExpiresAt: null,
            },
        )

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password',
        })
    }
}

// ============================================================
// DELETE ACCOUNT (2 day recovery buffer)
// ============================================================
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.User.id
        const existingUser = await User.findById(userId)

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        if (existingUser.Buffer) {
            return res.status(400).json({
                success: false,
                message: 'Account is already scheduled for deletion',
            })
        }

        const deletionDate = new Date()
        deletionDate.setDate(deletionDate.getDate() + 2)

        const dd = String(deletionDate.getDate()).padStart(2, '0')
        const mm = String(deletionDate.getMonth() + 1).padStart(2, '0')
        const yy = String(deletionDate.getFullYear()).slice(-2)
        const bufferTiming = `${dd} ${mm} ${yy}`

        await User.findByIdAndUpdate(userId, {
            Buffer: true,
            BufferTiming: bufferTiming,
        })

        try {
            await mailSender(
                existingUser.email,
                'Your account is scheduled for deletion',
                deleteAccountEmail(existingUser.email, existingUser.firstName, existingUser.lastName, bufferTiming)
            )
        } catch (mailError) {
            console.log('Delete-account mail failed:', mailError.message)
        }

        return res.status(200).json({
            success: true,
            message: 'Account scheduled for deletion. Log back in within 2 days to recover it.',
            deletionDate: bufferTiming,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to delete account',
        })
    }
}

// ============================================================
// RECOVER ACCOUNT (undo the scheduled deletion within the buffer window)
// ============================================================
exports.recoverAccount = async (req, res) => {
    try {
        const userId = req.User.id
        const existingUser = await User.findById(userId)

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        if (!existingUser.Buffer) {
            return res.status(400).json({
                success: false,
                message: 'Account is not scheduled for deletion',
            })
        }

        const [dd, mm, yy] = existingUser.BufferTiming.split(' ')
        const deletionDate = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd))

        if (Date.now() > deletionDate.getTime()) {
            return res.status(410).json({
                success: false,
                message: 'Recovery window has expired, the account can no longer be recovered',
            })
        }

        await User.findByIdAndUpdate(userId, {
            Buffer: false,
            BufferTiming: null,
        })

        return res.status(200).json({
            success: true,
            message: 'Account recovered successfully',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to recover account',
        })
    }
}

// ============================================================
// GET PROFILE — everything the Account page needs in one call sir
// ============================================================
exports.getProfile = async (req, res) => {
    try {
        const id = req.User.id

        const user = await User.findById(id)
            .select('firstName lastName email role Verified Subscription SubType SubscriptionExpires count creditCycleStart bonusCredits docSummaryCount bulkSummaryCount audioSummaryCount receiveDigest currentStreak longestStreak dailyGoal hasCompletedOnboarding createdAt Buffer BufferTiming isBanned banReason appealStatus appealMessage twoFactorEnabled')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found, please log in again',
            })
        }

        // apply the lazy credit-cycle reset BEFORE reading count/bonusCredits below sir — otherwise
        // a stale cycle's usage would show even though the reset has technically already occurred
        await resetCycleIfNeeded(user)

        // the effective plan sir — an expired Pro is a Basic again
        const plan = getEffectivePlan(user)

        // start of today in UTC sir — matches the calendar-day boundary used by recordStudyActivity
        const todayStart = new Date(`${dayKey(new Date())}T00:00:00.000Z`)

        const [noteCount, chatCount, notesToday, reviewsToday, quizzesToday] = await Promise.all([
            Note.countDocuments({ user: id }),
            Chat.countDocuments({ user: id }),
            Note.countDocuments({ user: id, createdAt: { $gte: todayStart } }),
            Flashcard.countDocuments({ user: id, lastReviewedAt: { $gte: todayStart } }),
            Quiz.countDocuments({ user: id, 'lastAttempt.attemptedAt': { $gte: todayStart } }),
        ])
        const studyActionsToday = notesToday + reviewsToday + quizzesToday

        return res.status(200).json({
            success: true,
            user,
            plan: {
                key: plan.key,
                name: plan.name,
                creditsUsed: user.count,
                creditsLimit: plan.credits,          // null means unlimited sir
                bonusCredits: user.bonusCredits,
                maxMessagesPerChat: plan.maxMessagesPerChat,
                expiresAt: plan.key === 'Basic' ? null : user.SubscriptionExpires,
                // per-feature monthly usage sir — mirrors utils/Plans.js PLANS[...].featureLimits,
                // null limit means unlimited, same convention as creditsLimit above
                features: {
                    docSummary: { used: user.docSummaryCount, limit: plan.featureLimits.docSummary },
                    bulkSummary: { used: user.bulkSummaryCount, limit: plan.featureLimits.bulkSummary },
                    audioSummary: { used: user.audioSummaryCount, limit: plan.featureLimits.audioSummary },
                },
            },
            activity: {
                noteCount,
                chatCount,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                dailyGoal: user.dailyGoal,
                studyActionsToday,
            }
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to get the profile',
        })
    }
}

// ============================================================
// APPEAL A BAN — POST /appeal sir, banned users only (route is NOT behind blockIfBanned,
// that's the whole point). One shot: appealStatus must still be 'none', so this always
// 400s on a second attempt or after an admin has denied the first one. A Deny is permanent —
// there is no path back to 'none' except an admin unbanning the account outright.
// ============================================================
exports.appealBan = async (req, res) => {
    try {
        const userId = req.User.id
        const { message } = req.body

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please explain why your account should be reinstated',
            })
        }

        const user = await User.findById(userId).select('isBanned appealStatus')
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        if (!user.isBanned) {
            return res.status(400).json({ success: false, message: 'Your account is not banned' })
        }

        if (user.appealStatus !== 'none') {
            return res.status(400).json({
                success: false,
                message: user.appealStatus === 'pending'
                    ? 'Your appeal has already been submitted and is awaiting review'
                    : 'Your appeal was reviewed and denied — this decision is final',
            })
        }

        await User.findByIdAndUpdate(userId, {
            appealStatus: 'pending',
            appealMessage: message.trim(),
            appealSubmittedAt: new Date(),
        })

        return res.status(200).json({
            success: true,
            message: 'Your appeal has been submitted for review',
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to submit your appeal',
        })
    }
}
