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
        // per-feature monthly counters sir — separate from `count` above, gated by
        // PLANS[...].featureLimits in utils/Plans.js (consumeFeatureUsage), reset alongside
        // `count`/`bonusCredits` at the same creditCycleStart boundary
        docSummaryCount: {
            type: Number,
            default: 0
        },
        bulkSummaryCount: {
            type: Number,
            default: 0
        },
        audioSummaryCount: {
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
        // consecutive days with at least one study action (flashcard review, quiz attempt, or
        // new note) sir — resets to 1 if a day is missed, updated only via utils/Streak.js
        currentStreak: {
            type: Number,
            default: 0
        },
        // the last calendar day a study action counted toward the streak sir — used to detect
        // "already counted today" vs "yesterday" vs "missed a day"
        lastStreakDate: {
            type: Date,
            default: null
        },
        // best currentStreak this user has ever reached sir — never decreases, only bumped
        // upward in utils/Streak.js when currentStreak passes it
        longestStreak: {
            type: Number,
            default: 0
        },
        // user-set target for study actions per day sir — purely a UI progress target, doesn't
        // gate anything server-side
        dailyGoal: {
            type: Number,
            default: 5,
            min: 1,
            max: 50
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
        },
        // Pro/ProMax perk sir — lets the user pick which Groq model powers their summaries/
        // chats/flashcards/quizzes instead of the one fixed default. null means "use the plan's
        // default model." Validated against utils/Plans.js MODEL_CATALOG at request time, not
        // here — the allowed list is plan-gated and can change without a migration this way.
        preferredModel: {
            type: String,
            default: null
        },
        // onboarding checklist sir — a new signup gets a sample note (see createUser) and sees
        // a dismissible 3-step checklist on the dashboard until this flips true, either by
        // completing all 3 steps or clicking "dismiss" manually
        hasCompletedOnboarding: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
