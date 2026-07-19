const User = require('../Models/User')
const Notification = require('../Models/Notification')

// One-time bell notification for the 2026-07 ProMax change sir — the plan went from
// unlimited to 500 credits / 500 messages per chat (see utils/Plans.js), and users who
// paid while the pricing page said "Unlimited" deserve to be told, not to find out by
// hitting a limit mid-study-session.
//
// Runs at every server boot (Render restarts constantly, there's no shell to run a
// script from) and is idempotent via the NOTICE_TYPE marker — a user who already has
// one is never notified again, and a user who upgrades to ProMax later gets it on the
// next boot. Delete this file and its index.js call once the rollout is old news.
const NOTICE_TYPE = 'promax_cap_2026_07'
const NOTICE_MESSAGE =
    'Pro Max update: your plan now includes 500 credits and 500 messages per chat each month (previously unlimited) — and credit top-up packs are now available to you too. See your Account page for details.'

const backfillProMaxCapNotice = async () => {
    try {
        const proMaxIds = await User.find({ SubType: 'ProMax' }).distinct('_id')
        if (proMaxIds.length === 0) return

        const alreadyNotified = new Set(
            (await Notification.find({ type: NOTICE_TYPE }).distinct('user')).map(String)
        )

        const docs = proMaxIds
            .filter((id) => !alreadyNotified.has(String(id)))
            .map((user) => ({ user, type: NOTICE_TYPE, message: NOTICE_MESSAGE, link: '/Dashboard/Account' }))

        if (docs.length > 0) {
            await Notification.insertMany(docs)
            console.log(`ProMax cap notice sent to ${docs.length} user(s)`.bgYellow.black)
        }
    } catch (err) {
        // fire-and-forget sir — a failed backfill must never block server startup
        console.log('ProMax cap notice backfill failed:', err.message)
    }
}

module.exports = { backfillProMaxCapNotice }
