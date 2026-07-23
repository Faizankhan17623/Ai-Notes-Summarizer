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
        // optional sir — an OAuth-only account (see controllers/OAuth.js) never sets one.
        // loginUser's password branch only ever runs for an account that HAS one; an
        // OAuth-only user can add a password later via a future "set a password" action
        // if they want email/password login too, but nothing forces that today.
        password: {
            type: String,
        },
        // every linked social account sir — an array (not a single field) so one User can
        // link Google AND GitHub etc. over time. Same email across providers auto-links to
        // this array rather than creating a second account (see controllers/OAuth.js).
        oauthProviders: [{
            provider: {
                type: String,
                enum: ['google', 'facebook', 'github', 'linkedin'],
                required: true
            },
            providerId: {
                type: String,
                required: true
            },
            connectedAt: {
                type: Date,
                default: Date.now
            }
        }],
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
        // fires the 'credits_low' in-app notification once per cycle sir — set the moment
        // usage crosses 90% of any tracked pool (see utils/Plans.js consumeCredit/
        // consumeFeatureUsage), reset alongside count/bonusCredits/etc at the same
        // creditCycleStart boundary so it re-arms every cycle
        lowCreditNotified: {
            type: Boolean,
            default: false
        },
        // fires the 'plan_expiring' in-app notification once sir — set by utils/PlanExpiryJob.js
        // when SubscriptionExpires is within the warning window, reset to false whenever
        // SubscriptionExpires is renewed on a fresh payment (see controllers/Payment.js)
        planExpiryNotified: {
            type: Boolean,
            default: false
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
        // RBAC sir — User is normal, Support can view/help but not destroy, Billing can view/help
        // AND refund (but not ban/role-change/announce), Admin can do everything
        role: {
            type: String,
            enum: ['User', 'Support', 'Billing', 'Admin'],
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
        // one-shot appeal sir — a banned user can submit exactly once (see POST /appeal).
        // 'pending' shows "under review" on their locked dashboard; an admin's Deny flips it
        // to 'denied', which is permanent (the appeal button never comes back). Unbanning
        // resets this to 'none' so a future ban starts with a fresh appeal available.
        appealStatus: {
            type: String,
            enum: ['none', 'pending', 'denied'],
            default: 'none'
        },
        appealMessage: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        appealSubmittedAt: {
            type: Date,
            default: null
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
        // 2FA (TOTP) sir — twoFactorEnabled gates the login-flow branch in controllers/user.js
        // loginUser (password-verified but 2FA-required accounts get a short-lived pending
        // token instead of a full session, see controllers/TwoFactor.js). totpSecret is the
        // base32 secret an authenticator app was seeded with — only ever persisted AFTER
        // /2fa/enable verifies the user actually has it working, never at /2fa/setup time.
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        totpSecret: {
            type: String,
            default: null
        },
        // one-time recovery codes sir — hashed with the same hashToken (SHA-256) helper the
        // refresh token uses, never stored/shown in plaintext after generation. Each code is
        // removed from this array the moment it's used (see verifyTwoFactor), so a stolen DB
        // snapshot alone can't be replayed even once past the codes it captured.
        twoFactorBackupCodes: [{
            type: String
        }],
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
