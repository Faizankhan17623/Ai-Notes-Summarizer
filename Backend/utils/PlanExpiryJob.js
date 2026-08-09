const User = require('../Models/User')
const { notify } = require('../controllers/Notification')

const WARNING_WINDOW_DAYS = 3

// the actual work sir — split out from the cron.schedule wrapper below so Backend/jobs/runJob.js
// can call it directly once (via GitHub Actions) without registering a node-cron timer
const runPlanExpiryWarnings = async () => {
    console.log('Running plan-expiry warning job...')
    const now = new Date()
    const warningCutoff = new Date(now.getTime() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const users = await User.find({
        SubType: { $ne: 'Basic' },
        SubscriptionExpires: { $gte: now, $lte: warningCutoff },
        planExpiryNotified: { $ne: true },
        isBanned: false,
    }).select('_id SubType SubscriptionExpires')

    // sequential, not Promise.all, sir — same reasoning as DigestJob.js: one user's failure
    // shouldn't take down the rest of the batch, even though this path has no SMTP burst risk
    for (const user of users) {
        try {
            const daysLeft = Math.max(1, Math.ceil((user.SubscriptionExpires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
            notify({
                user: user._id,
                type: 'plan_expiring',
                message: `Your ${user.SubType} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renew to keep your credits and features.`,
                link: '/Pricing',
            })
            await User.findByIdAndUpdate(user._id, { planExpiryNotified: true })
        } catch (err) {
            console.log(`Plan-expiry warning failed for user ${user._id}:`, err.message)
        }
    }
    console.log(`Plan-expiry warnings sent to up to ${users.length} users`)
}

module.exports = { runPlanExpiryWarnings }
