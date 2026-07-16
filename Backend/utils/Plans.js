const User = require('../Models/User')

// plan catalogue sir — every credit/limit/prompt-depth decision in the app reads from here ONLY
// key = value stored on User.SubType
const PLANS = {
    Basic: {
        key: 'Basic',
        name: 'Basic',
        credits: 5,              // per month, free
        maxMessagesPerChat: 60,
        contextWindow: 10,        // past turns replayed into the chat prompt
        // per-feature monthly caps sir — independent of the `credits` pool above, gated by
        // consumeFeatureUsage() below. null means unlimited, same convention as `credits`
        featureLimits: { docSummary: 10, bulkSummary: 10, audioSummary: 10 },
    },
    Pro: {
        key: 'Pro',
        name: 'Pro',
        credits: 100,
        maxMessagesPerChat: 200,
        contextWindow: 20,
        featureLimits: { docSummary: 80, bulkSummary: 80, audioSummary: 80 },
    },
    ProMax: {
        key: 'ProMax',
        name: 'Pro Max',
        credits: null,            // unlimited
        maxMessagesPerChat: null, // unlimited
        contextWindow: 40,
        featureLimits: { docSummary: 150, bulkSummary: 150, audioSummary: 150 },
    },
}

// maps a feature key to its User counter field + a human label for the block message sir
const FEATURE_FIELDS = {
    docSummary: { field: 'docSummaryCount', label: 'document summaries' },
    bulkSummary: { field: 'bulkSummaryCount', label: 'bulk file uploads' },
    audioSummary: { field: 'audioSummaryCount', label: 'audio summaries' },
}

// one-time top-up credit packs sir — bought via /payment/order with packKey instead of plan,
// consumed as User.bonusCredits (see consumeCredit below). Base Pro rate is ~499/100 =
// 4.99rs/credit; small sits near parity (impulse-purchase, low absolute price), medium/large
// get a volume discount, the standard SaaS credit-pack pattern
const CREDIT_PACKS = {
    small: { key: 'small', credits: 20, priceInr: 99, name: '20 credits' },
    medium: { key: 'medium', credits: 50, priceInr: 219, name: '50 credits' },
    large: { key: 'large', credits: 100, priceInr: 399, name: '100 credits' },
}

const CYCLE_MS = 30 * 24 * 60 * 60 * 1000

// true if the current credit cycle has elapsed sir — lazy, no cron needed
const cycleElapsed = (user) => {
    const start = user.creditCycleStart || user.createdAt || new Date(0)
    return Date.now() - start.getTime() >= CYCLE_MS
}

// resets count + bonusCredits + the per-feature counters and bumps creditCycleStart sir —
// called before any read/spend so a user never sees stale usage from a previous cycle
const resetCycleIfNeeded = async (user) => {
    if (!cycleElapsed(user)) return user
    const now = new Date()
    const zeroed = { count: 0, bonusCredits: 0, docSummaryCount: 0, bulkSummaryCount: 0, audioSummaryCount: 0, creditCycleStart: now }
    await User.findByIdAndUpdate(user._id, zeroed)
    Object.assign(user, zeroed)
    return user
}

// an expired paid plan silently falls back to Basic sir — this is the single source of truth for "what plan is this user really on right now"
const getEffectivePlan = (user) => {
    if (user.SubType !== 'Basic' && user.SubscriptionExpires && user.SubscriptionExpires.getTime() < Date.now()) {
        return PLANS.Basic
    }
    return PLANS[user.SubType] || PLANS.Basic
}

const USER_PLAN_FIELDS = 'SubType SubscriptionExpires count creditCycleStart bonusCredits docSummaryCount bulkSummaryCount audioSummaryCount createdAt'

// fetch the user fresh and resolve their effective plan sir
const getUserPlan = async (userId) => {
    const user = await User.findById(userId).select(USER_PLAN_FIELDS)
    if (!user) return null
    await resetCycleIfNeeded(user)
    return getEffectivePlan(user)
}

// spend one credit sir — call this before every Groq summarize call
// returns { ok:true, plan } or { ok:false, message }
const consumeCredit = async (userId) => {
    const user = await User.findById(userId).select(USER_PLAN_FIELDS)
    if (!user) {
        return { ok: false, message: 'Account not found, please log in again' }
    }

    await resetCycleIfNeeded(user)

    const plan = getEffectivePlan(user)

    // unlimited plan sir — nothing to check or increment
    if (plan.credits === null) {
        return { ok: true, plan: plan.key }
    }

    if (user.count < plan.credits) {
        await User.findByIdAndUpdate(userId, { $inc: { count: 1 } })
        return { ok: true, plan: plan.key }
    }

    // plan allowance exhausted sir — fall back to purchased top-up credits before hard-blocking
    if (user.bonusCredits > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { bonusCredits: -1 } })
        return { ok: true, plan: plan.key, usedBonus: true, bonusRemaining: user.bonusCredits - 1 }
    }

    return {
        ok: false,
        message: `You have used all ${plan.credits} credits on the ${plan.name} plan this month, please upgrade or buy a top-up pack to keep going`,
    }
}

// spend one unit of a per-feature monthly allowance sir — feature is one of
// 'docSummary' | 'bulkSummary' | 'audioSummary' (see FEATURE_FIELDS above). Independent of
// consumeCredit's shared pool — call this instead of (not in addition to) consumeCredit for
// document/bulk/audio summarize calls. Returns { ok:true, plan } or { ok:false, message }
const consumeFeatureUsage = async (userId, feature) => {
    const meta = FEATURE_FIELDS[feature]
    if (!meta) {
        return { ok: false, message: 'Unknown feature' }
    }

    const user = await User.findById(userId).select(USER_PLAN_FIELDS)
    if (!user) {
        return { ok: false, message: 'Account not found, please log in again' }
    }

    await resetCycleIfNeeded(user)

    const plan = getEffectivePlan(user)
    const limit = plan.featureLimits?.[feature]

    // unlimited for this feature on this plan sir — nothing to check or increment
    if (limit === null || limit === undefined) {
        return { ok: true, plan: plan.key }
    }

    const used = user[meta.field] || 0
    if (used < limit) {
        await User.findByIdAndUpdate(userId, { $inc: { [meta.field]: 1 } })
        return { ok: true, plan: plan.key }
    }

    return {
        ok: false,
        message: `You have used all ${limit} ${meta.label} on the ${plan.name} plan this month, please upgrade to keep going`,
    }
}

module.exports = { PLANS, CREDIT_PACKS, getEffectivePlan, getUserPlan, consumeCredit, consumeFeatureUsage, resetCycleIfNeeded }
