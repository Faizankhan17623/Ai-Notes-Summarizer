const cron = require('node-cron')
const User = require('../Models/User')
const mailSender = require('./Nodemailer')
const { getWeeklyDigestData } = require('./DigestContent')
const { weeklyDigestTemplate } = require('../Templates/weeklyDigestTemplate')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const sendDigestToUser = async (user) => {
    const data = await getWeeklyDigestData(user._id)

    // skip a genuinely empty week sir — no point emailing "you did nothing"
    if (!data.notesThisWeek && !data.chatsThisWeek && !data.dueFlashcards && !data.quizzesTaken) {
        return
    }

    await mailSender(
        user.email,
        'Your week in notes',
        weeklyDigestTemplate(user.firstName, data, `${FRONTEND_URL}/Dashboard`)
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
