const AiLog = require('../Models/AiLog')

// fire-and-forget sir — logging must never slow down or break a user's request
const logAi = ({ user, type, plan, model, usage, latencyMs, success, error }) => {
    AiLog.create({
        user,
        type,
        plan,
        model,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        latencyMs,
        success,
        error,
    }).catch((err) => console.log('AiLog write failed:', err.message))
}

module.exports = { logAi }
