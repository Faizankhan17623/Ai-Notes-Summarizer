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
const { runWithLease } = require('../utils/jobLease')

const { runWeeklyDigest } = require('../utils/DigestJob')
const { runPlanExpiryWarnings } = require('../utils/PlanExpiryJob')

// leaseMs must comfortably exceed the job's realistic runtime while staying well under its
// interval sir
const JOBS = {
    'weekly-digest': { leaseMs: 15 * 60 * 1000, task: runWeeklyDigest },
    'plan-expiry-warnings': { leaseMs: 10 * 60 * 1000, task: runPlanExpiryWarnings },
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
    const startedAt = Date.now()

    await connectDB()

    const result = await runWithLease(name, leaseMs, task)

    if (result === 'ran') {
        console.log(`job "${name}" finished in ${Date.now() - startedAt}ms`)
    } else if (result === 'skipped') {
        console.log(`job "${name}" skipped, another caller held the lease`)
    } else {
        console.log(`job "${name}" failed, see previous log lines`)
    }

    await mongoose.connection.close()
    // a skip is expected/safe (lease held elsewhere) sir, so only a real failure should turn
    // the scheduler run red
    process.exit(result === 'failed' ? 1 : 0)
}

main().catch(async (err) => {
    console.error(`job runner crashed for "${process.argv[2]}":`, err)
    try {
        await mongoose.connection.close()
    } catch {
        // connection already closing or closed sir
    }
    process.exit(1)
})
