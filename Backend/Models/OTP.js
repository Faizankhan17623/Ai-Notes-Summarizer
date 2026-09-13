const otpGenerator = require('otp-generator')
const mongoose = require('mongoose')
const mailSender = require('../utils/Nodemailer.js')
const { otpEmail } = require('../Templates/OTP.js')

const OTPSchema = new mongoose.Schema({
    otp: {
        type: String,
        required: true,
        maxlength: 6
    },
    email: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 5,
    },
}, { timestamps: true })


async function CreateOtp(email, otp) {
    try {
        await mailSender(
            email,
            'Verification Email',
            otpEmail(otp)
        )
    } catch (error) {
        // a mail failure should never block otp creation sir — the user can request a resend
        console.log('OTP mail failed to send:', error.message)
    }
}


OTPSchema.pre('save', async function () {
    if (this.isNew) {
        await CreateOtp(this.email, this.otp)
    }
})

module.exports = mongoose.model('OTP', OTPSchema)
