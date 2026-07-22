// thin runtime entry point sir — all Express app/middleware/route wiring lives in app.js now
// (split out so Backend/__tests__/ can require() the app without side effects). This file's
// only job is: connect the DB, schedule the cron jobs, run the one-time backfill, then listen.
const app = require('./app.js')
const connectDB = require('./Installation/mongo')
const { scheduleWeeklyDigest } = require('./utils/DigestJob.js')
const { schedulePlanExpiryWarnings } = require('./utils/PlanExpiryJob.js')
const { backfillProMaxCapNotice } = require('./utils/PlanChangeNotice.js')

const Port = process.env.PORT || 4000

// production startup order sir — connect the DB FIRST, only then accept traffic; otherwise the
// first requests after a deploy race the connection and fail with buffering timeouts
const startServer = async () => {
    await connectDB()

    // weekly summary email sir — in-process cron, no separate infra needed since the
    // web service process stays alive on Render
    scheduleWeeklyDigest()

    // daily in-app "plan expiring soon" notice sir — same in-process cron approach as above
    schedulePlanExpiryWarnings()

    // one-time bell notice about the ProMax credit cap sir — idempotent, safe on every boot
    backfillProMaxCapNotice()

    const server = app.listen(Port, () => {
        console.log(`Server running on port ${Port}`.bgGreen.black.bold)
    })

    // Render sends SIGTERM on every redeploy sir — finish in-flight requests instead of
    // dropping them mid-response, then exit so the new instance takes over
    process.on('SIGTERM', () => {
        console.log('SIGTERM received — shutting down gracefully'.bgRed.white.bold)
        server.close(() => process.exit(0))
    })
}

startServer()
