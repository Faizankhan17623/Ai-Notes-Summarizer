const cookie = require('cookie')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const otpGenerator = require('otp-generator')
const crypto = require('crypto')

const User = require('../Models/User')
const OTP = require('../Models/OTP.js')
const Note = require('../Models/Note.js')
const Chat = require('../Models/Chat.js')
const mailSender = require('../utils/Nodemailer.js')

const { deleteAccountEmail } = require('../Templates/DeleteAccount.js')
const { passwordResetTemplate } = require('../Templates/passwordResetTemplate.js')
const { getEffectivePlan } = require('../utils/Plans.js')

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
        const isStrongPassword = password.length >= 8
            && /[a-z]/.test(password)
            && /[A-Z]/.test(password)
            && /\d/.test(password)
            && /[^A-Za-z0-9]/.test(password)

        if (!isStrongPassword) {
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

        if (existingUser.isBanned) {
            return res.status(403).json({
                success: false,
                message: existingUser.banReason
                    ? `Your account has been suspended: ${existingUser.banReason}`
                    : 'Your account has been suspended, please contact support',
            })
        }

        const Comparing = await bcrypt.compare(password, existingUser.password)

        if (!Comparing) {
            return res.status(401).json({
                success: false,
                field: 'password',
                message: 'Incorrect password, please try again',
            })
        }

        // a soft-deleted account logging back in inside the buffer window is recovered automatically sir
        if (existingUser.Buffer) {
            existingUser.Buffer = false
            existingUser.BufferTiming = null
        }

        const { _id, firstName, lastName, role, SubType } = existingUser

        const JwtCreation = jwt.sign(
            { id: _id, firstName, lastName },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: '7d' }
        )

        existingUser.token = JwtCreation
        await existingUser.save()

        const SetCookie = cookie.serialize('token', JwtCreation, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        })

        res.setHeader('Set-Cookie', SetCookie)

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            token: JwtCreation,
            user: {
                id: _id,
                firstName,
                lastName,
                email: existingUser.email,
                role,
                SubType,
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
            { new: true }
        ).select('-password')

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
            { new: true }
        ).select('-password')

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

        const saltRounds = 10
        const hashing = await bcrypt.hash(newPassword, saltRounds)

        await User.findByIdAndUpdate(userId, { password: hashing })

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
            { new: true }
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

        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        await User.findOneAndUpdate(
            { resetPasswordToken: token },
            { password: encryptedPassword, resetPasswordToken: null, resetPasswordExpires: null },
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
            .select('firstName lastName email role Verified Subscription SubType SubscriptionExpires count createdAt Buffer BufferTiming')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found, please log in again',
            })
        }

        // the effective plan sir — an expired Pro is a Basic again
        const plan = getEffectivePlan(user)

        const [noteCount, chatCount] = await Promise.all([
            Note.countDocuments({ user: id }),
            Chat.countDocuments({ user: id }),
        ])

        return res.status(200).json({
            success: true,
            user,
            plan: {
                key: plan.key,
                name: plan.name,
                creditsUsed: user.count,
                creditsLimit: plan.credits,          // null means unlimited sir
                maxMessagesPerChat: plan.maxMessagesPerChat,
                expiresAt: plan.key === 'Basic' ? null : user.SubscriptionExpires,
            },
            activity: {
                noteCount,
                chatCount,
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
