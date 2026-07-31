const cron = require('node-cron')
const Groq = require('groq-sdk')
const User = require('../Models/User')
const mailSender = require('./Nodemailer')
const { getWeeklyDigestData } = require('./DigestContent')
const { weeklyDigestTemplate } = require('../Templates/weeklyDigestTemplate')
const { buildDigestPrompt } = require('./Prompts')
const { DEFAULT_MODEL } = require('./Plans')
const { logAi } = require('./AdminLog')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// free sir — this is a passive weekly email, not a user-triggered action, so it never spends
// a credit. If the AI call fails for any reason, the digest still sends WITHOUT the recap
// paragraph (see sendDigestToUser below) rather than blocking the whole email on it.
// hard cap sir — this runs sequentially per-user inside scheduleWeeklyDigest's for-loop
// below, so one hung Groq request (no response, dead connection) would otherwise stall
// every subsequent user's digest indefinitely. 20s matches the mail relay's own timeout in
// Nodemailer.js; a timeout here just means this one user's email goes out without the recap
// paragraph (see the catch below), same as any other recap-generation failure.
const RECAP_TIMEOUT_MS = 20000

const generateRecap = async (data) => {
    const t0 = Date.now()
    try {
        const invoking = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: buildDigestPrompt(data) },
                { role: 'user', content: 'Return only the JSON.' },
            ],
            model: DEFAULT_MODEL,
            temperature: 0.6,
            response_format: { type: 'json_object' },
        }, { timeout: RECAP_TIMEOUT_MS })
        logAi({ type: 'digest', plan: 'system', model: DEFAULT_MODEL, usage: invoking.usage, latencyMs: Date.now() - t0, success: true })

        let raw = invoking?.choices?.[0]?.message?.content
        if (!raw) return null
        if (raw.includes('</think>')) raw = raw.split('</think>').pop()
        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

        const parsed = JSON.parse(raw)
        return typeof parsed.recap === 'string' && parsed.recap.trim() ? parsed.recap.trim() : null
    } catch (err) {
        logAi({ type: 'digest', plan: 'system', model: DEFAULT_MODEL, latencyMs: Date.now() - t0, success: false, error: err.message })
        console.log('Digest recap generation failed:', err.message)
        return null
    }
}

const sendDigestToUser = async (user) => {
    const data = await getWeeklyDigestData(user._id)

    // skip a genuinely empty week sir — no point emailing "you did nothing"
    if (!data.notesThisWeek && !data.chatsThisWeek && !data.dueFlashcards && !data.quizzesTaken) {
        return
    }

    const recap = await generateRecap(data)

    await mailSender(
        user.email,
        'Your week in notes',
        weeklyDigestTemplate(user.firstName, { ...data, recap }, `${FRONTEND_URL}/Dashboard`)
    )
}

// every Monday at 08:00 server time sir
const scheduleWeeklyDigest = () => {
    cron.schedule('0 8 * * 1', async () => {
        console.log('Running weekly digest job...')
        const users = await User.find({ receiveDigest: true, isBanned: false }).select('_id firstName email')

        // sequential, not Promise.all, sir — avoids hammering the SMTP provider with a burst of
        // concurrent sends, and one user's failure (bad address, mail hiccup) never kills the batch
        for (const user of users) {
            try {
                await sendDigestToUser(user)
            } catch (err) {
                console.log(`Digest failed for ${user.email}:`, err.message)
            }
        }
        console.log(`Weekly digest sent to up to ${users.length} users`)
    })
}

module.exports = { scheduleWeeklyDigest, sendDigestToUser }
