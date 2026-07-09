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
    },
    Pro: {
        key: 'Pro',
        name: 'Pro',
        credits: 100,
        maxMessagesPerChat: 200,
        contextWindow: 20,
    },
    ProMax: {
        key: 'ProMax',
        name: 'Pro Max',
        credits: null,            // unlimited
        maxMessagesPerChat: null, // unlimited
        contextWindow: 40,
    },
}

// an expired paid plan silently falls back to Basic sir — this is the single source of truth for "what plan is this user really on right now"
const getEffectivePlan = (user) => {
    if (user.SubType !== 'Basic' && user.SubscriptionExpires && user.SubscriptionExpires.getTime() < Date.now()) {
        return PLANS.Basic
    }
    return PLANS[user.SubType] || PLANS.Basic
}

// fetch the user fresh and resolve their effective plan sir
const getUserPlan = async (userId) => {
    const user = await User.findById(userId).select('SubType SubscriptionExpires count')
    if (!user) return null
    return getEffectivePlan(user)
}

// spend one credit sir — call this before every Groq summarize call
// returns { ok:true, plan } or { ok:false, message }
const consumeCredit = async (userId) => {
    const user = await User.findById(userId).select('SubType SubscriptionExpires count')
    if (!user) {
        return { ok: false, message: 'Account not found, please log in again' }
    }

    const plan = getEffectivePlan(user)

    // unlimited plan sir — nothing to check or increment
    if (plan.credits === null) {
        return { ok: true, plan: plan.key }
    }

    if (user.count >= plan.credits) {
        return {
            ok: false,
            message: `You have used all ${plan.credits} credits on the ${plan.name} plan this month, please upgrade to keep going`,
        }
    }

    await User.findByIdAndUpdate(userId, { $inc: { count: 1 } })
    return { ok: true, plan: plan.key }
}

module.exports = { PLANS, getEffectivePlan, getUserPlan, consumeCredit }
