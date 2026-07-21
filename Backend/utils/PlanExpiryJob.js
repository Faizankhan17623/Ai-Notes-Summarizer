const cron = require('node-cron')
const User = require('../Models/User')
const { notify } = require('../controllers/Notification')

const WARNING_WINDOW_DAYS = 3

// every day at 08:00 server time sir — same cadence style as utils/DigestJob.js's weekly job,
// just daily since an expiry warning is time-sensitive in a way a weekly digest isn't
const schedulePlanExpiryWarnings = () => {
    cron.schedule('0 8 * * *', async () => {
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
    })
}

module.exports = { schedulePlanExpiryWarnings }
