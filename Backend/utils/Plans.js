const User = require('../Models/User')
const { notify } = require('../controllers/Notification')

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
        // consumeFeatureUsage() below. null means unlimited, same convention as `credits`.
        // chatMessages is a generous per-cycle ceiling on top of each message's own tiny
        // credit cost (see CHAT_MESSAGE_CREDIT_COST) and the per-chat maxMessagesPerChat cap
        // above — three independent brakes on the same feature, deliberately overlapping
        featureLimits: { docSummary: 10, bulkSummary: 10, audioSummary: 10, voiceChat: 10, chatMessages: 300 },
    },
    Pro: {
        key: 'Pro',
        name: 'Pro',
        credits: 100,
        maxMessagesPerChat: 200,
        contextWindow: 20,
        featureLimits: { docSummary: 80, bulkSummary: 80, audioSummary: 80, voiceChat: 80, chatMessages: 1500 },
    },
    ProMax: {
        key: 'ProMax',
        name: 'Pro Max',
        // capped since 2026-07 sir — was unlimited (null), but an unmetered top tier is an
        // abuse magnet on a free Groq key; 5x Pro keeps it clearly premium while bounded.
        // Top-up packs work here too — consumeCredit falls back to bonusCredits for any
        // capped plan, and the Account page shows the packs whenever creditsLimit != null
        credits: 500,
        maxMessagesPerChat: 500,
        contextWindow: 40,
        featureLimits: { docSummary: 150, bulkSummary: 150, audioSummary: 150, voiceChat: 150, chatMessages: 5000 },
    },
}

// chat messages are cheap sir — a whole credit per message would burn a Basic user's 5
// monthly credits in a few exchanges, so consumeChatMessage below only draws one real
// credit from the shared pool every this-many messages (message #20, #40, ... each cycle),
// on top of the chatMessages feature cap and the per-chat maxMessagesPerChat ceiling
const CHAT_MESSAGES_PER_CREDIT = 20

// the model each tier is stuck with if they haven't picked (or aren't allowed to pick) sir —
// the universal fallback, so an invalid/cleared preference never breaks a request.
// Catalog refreshed 2026-07-19: the old default qwen/qwen3-32b was SHUT DOWN by Groq on
// 2026-07-17 (deepseek-r1-distill-llama-70b and gemma2-9b-it died back in Oct 2025, and
// llama-3.1-8b-instant retires 2026-08-16) — every ID below is a current production model
// except the clearly-labelled preview. Check console.groq.com/docs/deprecations before
// adding or swapping any ID here.
const DEFAULT_MODEL = 'openai/gpt-oss-20b'

// which Groq models each plan is allowed to choose from sir — Basic has no choice (empty
// list, always DEFAULT_MODEL); Pro picks between fast and smart; ProMax gets the full menu.
// Every list should include DEFAULT_MODEL itself so "no preference set" and "explicitly
// picked the default" both work identically. Users whose saved preferredModel is no longer
// listed silently fall back to DEFAULT_MODEL via resolveModel below — no migration needed
const MODEL_CATALOG = {
    Basic: [],
    Pro: [
        { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (default)' },
        { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
    ],
    ProMax: [
        { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (default)' },
        { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
        { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B (preview)' },
    ],
}

// the model a given user's request should actually use sir — falls back to DEFAULT_MODEL if
// preferredModel is unset, OR set to something not in their current plan's catalog (e.g. they
// downgraded after picking a ProMax-only model). Call this right before every Groq call.
const resolveModel = (user) => {
    const plan = getEffectivePlan(user)
    const allowed = MODEL_CATALOG[plan.key] || []
    if (user.preferredModel && allowed.some((m) => m.id === user.preferredModel)) {
        return user.preferredModel
    }
    return DEFAULT_MODEL
}

// maps a feature key to its User counter field + a human label for the block message sir
const FEATURE_FIELDS = {
    docSummary: { field: 'docSummaryCount', label: 'document summaries' },
    bulkSummary: { field: 'bulkSummaryCount', label: 'bulk file uploads' },
    audioSummary: { field: 'audioSummaryCount', label: 'audio summaries' },
    voiceChat: { field: 'voiceChatCount', label: 'voice messages' },
    chatMessages: { field: 'chatMessageCount', label: 'chat messages' },
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
// called before any read/spend so a user never sees stale usage from a previous cycle.
// Uses an atomic conditional update (matched on the in-memory creditCycleStart) so two
// concurrent requests racing the exact rollover moment can't both apply a reset and
// interleave with each other's credit read — only the first write actually matches sir
const resetCycleIfNeeded = async (user) => {
    if (!cycleElapsed(user)) return user
    const now = new Date()
    const zeroed = { count: 0, bonusCredits: 0, docSummaryCount: 0, bulkSummaryCount: 0, audioSummaryCount: 0, voiceChatCount: 0, chatMessageCount: 0, lowCreditNotified: false, creditCycleStart: now }
    const updated = await User.findOneAndUpdate(
        { _id: user._id, creditCycleStart: user.creditCycleStart },
        zeroed,
        { new: true },
    ).select(USER_PLAN_FIELDS)
    // another concurrent request already reset it first sir — re-read so we don't stomp its work
    if (!updated) {
        const fresh = await User.findById(user._id).select(USER_PLAN_FIELDS)
        if (fresh) Object.assign(user, fresh.toObject())
        return user
    }
    Object.assign(user, updated.toObject())
    return user
}

// an expired paid plan silently falls back to Basic sir — this is the single source of truth for "what plan is this user really on right now"
const getEffectivePlan = (user) => {
    if (user.SubType !== 'Basic' && user.SubscriptionExpires && user.SubscriptionExpires.getTime() < Date.now()) {
        return PLANS.Basic
    }
    return PLANS[user.SubType] || PLANS.Basic
}

const USER_PLAN_FIELDS = 'SubType SubscriptionExpires count creditCycleStart bonusCredits docSummaryCount bulkSummaryCount audioSummaryCount voiceChatCount chatMessageCount lowCreditNotified preferredModel createdAt'

// fetch the user fresh and resolve their effective plan sir — the returned object also carries
// `model` (this user's resolved Groq model, see resolveModel above) alongside the plan's own
// fields, so callers that only ever read plan.key/plan.contextWindow/etc. are unaffected
const getUserPlan = async (userId) => {
    const user = await User.findById(userId).select(USER_PLAN_FIELDS)
    if (!user) return null
    await resetCycleIfNeeded(user)
    return { ...getEffectivePlan(user), model: resolveModel(user) }
}

// fires the one-per-cycle 'credits_low' notification the moment usage crosses 90% of a
// tracked pool sir — `before`/`after` are the pre/post-increment counts, `notified` is the
// user's current lowCreditNotified flag (already in scope from the caller's earlier fetch).
// Fire-and-forget like every other notify() call site, and the $set piggybacks on the same
// $inc update the caller already issues rather than a second DB round-trip.
const maybeNotifyLowCredit = (userId, before, after, limit, notified) => {
    if (notified || limit === null) return {}
    if (before / limit >= 0.9 || after / limit < 0.9) return {}
    notify({
        user: userId,
        type: 'credits_low',
        message: "You've used 90% of your credits for this cycle — upgrade or grab a top-up pack to avoid running out.",
        link: '/Pricing',
    })
    return { lowCreditNotified: true }
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
    const model = resolveModel(user)

    // unlimited plan sir — nothing to check or increment
    if (plan.credits === null) {
        return { ok: true, plan: plan.key, model }
    }

    // atomic conditional increment sir — the $lt filter is re-checked by MongoDB at write time,
    // not just read in JS beforehand, so two concurrent requests can't both pass a stale check
    // and both spend past the cap (the race the old read-then-write version had)
    const notifyUpdate = maybeNotifyLowCredit(userId, user.count, user.count + 1, plan.credits, user.lowCreditNotified)
    const spent = await User.findOneAndUpdate(
        { _id: userId, count: { $lt: plan.credits } },
        { $inc: { count: 1 }, ...(Object.keys(notifyUpdate).length ? { $set: notifyUpdate } : {}) },
        { new: true },
    ).select(USER_PLAN_FIELDS)
    if (spent) {
        return { ok: true, plan: plan.key, model }
    }

    // plan allowance exhausted sir — fall back to purchased top-up credits before hard-blocking.
    // Same atomic pattern: condition on bonusCredits > 0 at write time, not a stale JS read
    const bonusSpent = await User.findOneAndUpdate(
        { _id: userId, bonusCredits: { $gt: 0 } },
        { $inc: { bonusCredits: -1 } },
        { new: true },
    ).select(USER_PLAN_FIELDS)
    if (bonusSpent) {
        return { ok: true, plan: plan.key, model, usedBonus: true, bonusRemaining: bonusSpent.bonusCredits }
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
    const model = resolveModel(user)
    const limit = plan.featureLimits?.[feature]

    // unlimited for this feature on this plan sir — nothing to check or increment
    if (limit === null || limit === undefined) {
        return { ok: true, plan: plan.key, model }
    }

    const used = user[meta.field] || 0
    // atomic conditional increment sir — same fix as consumeCredit above, condition re-checked
    // by MongoDB at write time so concurrent requests can't both slip past a stale JS check
    const notifyUpdate = maybeNotifyLowCredit(userId, used, used + 1, limit, user.lowCreditNotified)
    const spent = await User.findOneAndUpdate(
        { _id: userId, [meta.field]: { $lt: limit } },
        { $inc: { [meta.field]: 1 }, ...(Object.keys(notifyUpdate).length ? { $set: notifyUpdate } : {}) },
        { new: true },
    ).select(USER_PLAN_FIELDS)
    if (spent) {
        return { ok: true, plan: plan.key, model }
    }

    return {
        ok: false,
        message: `You have used all ${limit} ${meta.label} on the ${plan.name} plan this month, please upgrade to keep going`,
    }
}

// spend one chat message/regenerate sir — the three independent brakes on plain-text chat:
// 1) the chatMessages feature cap below (a generous per-cycle ceiling, same mechanism as
//    consumeFeatureUsage), 2) one real credit drawn from the shared pool every
//    CHAT_MESSAGES_PER_CREDIT messages (falls back to bonusCredits, same as consumeCredit),
//    and 3) the per-chat maxMessagesPerChat cap + the chat-route rate limiter, both enforced
//    by the caller. Call this once per user-facing chat turn (sendMessage/regenerate, whether
//    streamed or not) — NOT for voice messages, which already spend a voiceChat feature unit.
// Returns { ok:true, plan, model } or { ok:false, message }
const consumeChatMessage = async (userId) => {
    const user = await User.findById(userId).select(USER_PLAN_FIELDS)
    if (!user) {
        return { ok: false, message: 'Account not found, please log in again' }
    }

    await resetCycleIfNeeded(user)

    const plan = getEffectivePlan(user)
    const model = resolveModel(user)
    const limit = plan.featureLimits?.chatMessages
    const used = user.chatMessageCount || 0

    if (limit !== null && limit !== undefined && used >= limit) {
        return {
            ok: false,
            message: `You have used all ${limit} chat messages on the ${plan.name} plan this month, please upgrade to keep going`,
        }
    }

    // does THIS message land on a credit-charging multiple sir — checked against the
    // pre-increment count so message #20 (the 20th message, used===19 beforehand) is the
    // one that spends, keeping the very first message of a fresh cycle free
    const spendsCredit = plan.credits !== null && (used + 1) % CHAT_MESSAGES_PER_CREDIT === 0

    const featureFilter = (limit !== null && limit !== undefined)
        ? { _id: userId, chatMessageCount: { $lt: limit } }
        : { _id: userId }

    if (!spendsCredit) {
        const notifyUpdate = maybeNotifyLowCredit(userId, used, used + 1, limit, user.lowCreditNotified)
        const spent = await User.findOneAndUpdate(
            featureFilter,
            { $inc: { chatMessageCount: 1 }, ...(Object.keys(notifyUpdate).length ? { $set: notifyUpdate } : {}) },
            { new: true },
        ).select(USER_PLAN_FIELDS)
        if (!spent) {
            return {
                ok: false,
                message: `You have used all ${limit} chat messages on the ${plan.name} plan this month, please upgrade to keep going`,
            }
        }
        return { ok: true, plan: plan.key, model }
    }

    // this message needs a real credit too sir — same atomic $lt-conditioned pattern as
    // consumeCredit, combined into one update alongside the chatMessageCount bump
    const spent = await User.findOneAndUpdate(
        { ...featureFilter, count: { $lt: plan.credits } },
        { $inc: { chatMessageCount: 1, count: 1 } },
        { new: true },
    ).select(USER_PLAN_FIELDS)
    if (spent) {
        return { ok: true, plan: plan.key, model }
    }

    // feature cap had room but the shared credit pool didn't sir — fall back to bonus
    // credits before hard-blocking, same as consumeCredit
    const bonusSpent = await User.findOneAndUpdate(
        { ...featureFilter, bonusCredits: { $gt: 0 } },
        { $inc: { chatMessageCount: 1, bonusCredits: -1 } },
        { new: true },
    ).select(USER_PLAN_FIELDS)
    if (bonusSpent) {
        return { ok: true, plan: plan.key, model, usedBonus: true, bonusRemaining: bonusSpent.bonusCredits }
    }

    // could be the feature cap or the credit pool that finally blocked it sir — re-read to
    // give an accurate message rather than guessing
    const fresh = await User.findById(userId).select(USER_PLAN_FIELDS)
    if (fresh && limit !== null && limit !== undefined && (fresh.chatMessageCount || 0) >= limit) {
        return {
            ok: false,
            message: `You have used all ${limit} chat messages on the ${plan.name} plan this month, please upgrade to keep going`,
        }
    }
    return {
        ok: false,
        message: `You have used all ${plan.credits} credits on the ${plan.name} plan this month, please upgrade or buy a top-up pack to keep going`,
    }
}

module.exports = { PLANS, CREDIT_PACKS, MODEL_CATALOG, DEFAULT_MODEL, CHAT_MESSAGES_PER_CREDIT, resolveModel, getEffectivePlan, getUserPlan, consumeCredit, consumeFeatureUsage, consumeChatMessage, resetCycleIfNeeded }
