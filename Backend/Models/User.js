const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        token: {
            type: String,
        },
        resetPasswordToken: {
            type: String,
        },
        resetPasswordExpires: {
            type: Date,
        },
        // credits used in the current cycle sir — see creditCycleStart below, reset lazily by
        // utils/Plans.js resetCycleIfNeeded, no cron needed
        count: {
            type: Number,
            default: 0
        },
        // anchors the current credit cycle sir — rolls on a 30-day window from this date,
        // realigned to "now" on every successful Pro/ProMax payment (see verifyPayment)
        creditCycleStart: {
            type: Date,
            default: Date.now
        },
        // one-time top-up credits sir — purchased via a CreditPack payment, spent AFTER the
        // plan's monthly allowance is exhausted, reset to 0 alongside `count` at the same
        // cycle boundary (see utils/Plans.js consumeCredit)
        bonusCredits: {
            type: Number,
            default: 0
        },
        Verified: {
            type: Boolean,
            default: false,
            required: true
        },
        // opt-out sir — most users want the weekly summary email, so it defaults on
        receiveDigest: {
            type: Boolean,
            default: true
        },
        // consecutive days with at least one flashcard review sir — resets to 1 if a day is
        // missed, updated only in reviewFlashcard (StudyKit.js), never elsewhere
        currentStreak: {
            type: Number,
            default: 0
        },
        // the last calendar day a review counted toward the streak sir — used to detect
        // "already counted today" vs "yesterday" vs "missed a day"
        lastStreakDate: {
            type: Date,
            default: null
        },
        // 2-day soft-delete buffer sir
        Buffer: {
            type: Boolean,
            default: false
        },
        BufferTiming: {
            type: String
        },
        Notes: [{
            type: mongoose.Schema.ObjectId,
            ref: 'Note'
        }],
        Chats: [{
            type: mongoose.Schema.ObjectId,
            ref: 'Chat'
        }],
        // RBAC sir — User is normal, Support can view/help but not destroy, Admin can do everything
        role: {
            type: String,
            enum: ['User', 'Support', 'Admin'],
            default: 'User'
        },
        // moderation sir — a banned user is blocked by the Auth middleware everywhere, instantly
        isBanned: {
            type: Boolean,
            default: false
        },
        banReason: {
            type: String,
            trim: true
        },
        // self-healing brute-force lockout sir — separate from isBanned (admin-driven, permanent).
        // this clears itself once lockUntil passes, no admin action needed
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date,
            default: null
        },
        // refresh token sir — same hash-only-storage principle as apiKeyHash below, the raw value
        // only ever lives in the httpOnly refreshToken cookie, never in the DB
        refreshTokenHash: {
            type: String,
            default: null
        },
        refreshTokenExpiresAt: {
            type: Date,
            default: null
        },
        Subscription: {
            type: Boolean,
            default: false
        },
        // every user starts on the free Basic plan sir
        SubType: {
            type: String,
            enum: ['Basic', 'Pro', 'ProMax'],
            default: 'Basic'
        },
        // when the paid plan runs out sir — past this date the user is Basic again
        SubscriptionExpires: {
            type: Date
        },
        // Pro/ProMax perk sir — programmatic access to POST /summarize only, see Middlewares/ApiKeyAuth.js
        // only the SHA-256 hash is stored, same principle as the password — the raw key is shown once at
        // creation time and never again, so a DB leak alone can't be used to impersonate the user
        apiKeyHash: {
            type: String,
            default: null,
            index: true,
            sparse: true
        },
        apiKeyCreatedAt: {
            type: Date
        },
        apiKeyLastUsedAt: {
            type: Date
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
