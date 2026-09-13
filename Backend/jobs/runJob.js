// Runs ONE scheduled job and exits sir.
//
// WHY THIS EXISTS: the weekly digest and plan-expiry warning jobs used to run in-process inside
// Backend/index.js via node-cron, which means they only fire while the web server is alive. That's
// fine on Render's paid tiers, but costs nothing extra to replace: an external scheduler (GitHub
// Actions) invokes a single job here, it does its work, and exits.
//
//   node jobs/runJob.js weekly-digest
//
// The job names and their task functions match Backend/index.js's old in-process schedule
// exactly (runWeeklyDigest / runPlanExpiryWarnings), so neither path can drift from the other.
//
// The lease from utils/jobLease.js is applied, which means this is safe to run even if the
// in-process node-cron schedule is ever re-enabled for local dev: whichever caller acquires the
// lease does the work and the other skips. An accidental double-trigger is therefore a no-op
// rather than a duplicate email.
//
// Exits 0 on success, 1 on failure, so a scheduler can alert on a red run.

require('dotenv').config({ quiet: true })

const mongoose = require('mongoose')

const connectDB = require('../Installation/mongo')
const { runWithLease, INSTANCE_ID } = require('../utils/jobLease')
const JobRun = require('../Models/JobRun')
const User = require('../Models/User')
const mailSender = require('../utils/Nodemailer')
const { jobFailedEmail } = require('../Templates/JobFailed')

const { runWeeklyDigest } = require('../utils/DigestJob')
const { runPlanExpiryWarnings } = require('../utils/PlanExpiryJob')
const { runReminders } = require('../utils/ReminderJob')

// leaseMs must comfortably exceed the job's realistic runtime while staying well under its
// interval sir
const JOBS = {
    'weekly-digest': { leaseMs: 15 * 60 * 1000, task: runWeeklyDigest },
    'plan-expiry-warnings': { leaseMs: 10 * 60 * 1000, task: runPlanExpiryWarnings },
    reminders: { leaseMs: 10 * 60 * 1000, task: runReminders },
}

// GitHub Actions exposes the run in this shape sir — used to link straight to the failing log
// from the alert email/dashboard instead of making an admin go hunt for it
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null

// best-effort sir — a failure here must never mask the original job failure or crash the
// runner. Every step (JobRun write, admin lookup, each email) is independently guarded so one
// broken piece (e.g. mail relay down too) doesn't stop the others from being attempted.
//
// Also covers the case where connectDB() itself never succeeded (bad MONGO_DB_URL, network
// issue) sir — main()'s outer .catch() still calls this, and without this guard JobRun.create/
// User.find would hang against a Mongoose instance that was never connected, since Mongoose
// buffers operations by default instead of failing fast.
const reportFailure = async (jobName, startedAt, finishedAt, errorMessage) => {
    if (mongoose.connection?.readyState !== 1) {
        console.log(`skipping failure report for "${jobName}", no database connection`)
        return
    }

    try {
        await JobRun.create({
            jobName,
            result: 'failed',
            startedAt,
            finishedAt,
            error: errorMessage,
            runId: process.env.GITHUB_RUN_ID || INSTANCE_ID,
        })
    } catch (err) {
        console.log('failed to write JobRun record:', err.message)
    }

    try {
        const admins = await User.find({ role: 'Admin' }).select('email')
        await Promise.all(
            admins.map((admin) =>
                mailSender(admin.email, `Scheduled job failed: ${jobName}`, jobFailedEmail(jobName, errorMessage, runUrl))
                    .catch((err) => console.log(`failed to email admin ${admin.email}:`, err.message))
            )
        )
    } catch (err) {
        console.log('failed to notify admins of job failure:', err.message)
    }
}

const reportSuccess = async (jobName, startedAt, finishedAt) => {
    try {
        await JobRun.create({ jobName, result: 'ran', startedAt, finishedAt, runId: process.env.GITHUB_RUN_ID || INSTANCE_ID })
    } catch (err) {
        console.log('failed to write JobRun record:', err.message)
    }
}

const main = async () => {
    const name = process.argv[2]

    if (!name || !JOBS[name]) {
        console.error(
            `Usage: node jobs/runJob.js <job>\n\nAvailable jobs:\n  ${Object.keys(JOBS).join('\n  ')}`
        )
        process.exit(1)
    }

    const { leaseMs, task } = JOBS[name]
    const startedAt = new Date()

    await connectDB()

    const { status, error } = await runWithLease(name, leaseMs, task)
    const finishedAt = new Date()

    if (status === 'ran') {
        console.log(`job "${name}" finished in ${finishedAt - startedAt}ms`)
        await reportSuccess(name, startedAt, finishedAt)
    } else if (status === 'skipped') {
        console.log(`job "${name}" skipped, another caller held the lease`)
    } else {
        console.log(`job "${name}" failed, see previous log lines`)
        await reportFailure(name, startedAt, finishedAt, error)
    }

    await mongoose.connection.close()
    // a skip is expected/safe (lease held elsewhere) sir, so only a real failure should turn
    // the scheduler run red
    process.exit(status === 'failed' ? 1 : 0)
}

main().catch(async (err) => {
    console.error(`job runner crashed for "${process.argv[2]}":`, err)
    try {
        await reportFailure(process.argv[2], new Date(), new Date(), err.message)
    } catch {
        // reportFailure already swallows its own errors sir — this catch is only for the
        // impossible case that it itself throws synchronously
    }
    try {
        await mongoose.connection.close()
    } catch {
        // connection already closing or closed sir
    }
    process.exit(1)
})
