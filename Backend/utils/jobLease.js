// leader election for scheduled jobs sir.
//
// THE PROBLEM: moving the weekly digest and plan-expiry warning jobs to GitHub Actions means a
// GitHub-triggered run and the in-process web server (if it's ever mid-deploy, or the schedule
// call is left in by mistake) could both try to run the same job at the same time. Neither job is
// safe to run twice — a double weekly digest or a double plan-expiry notice is a real user-facing
// bug, not just wasted work.
//
// THE FIX: a lease in Mongo. Before doing any work, a job asks for the lease for its name. Exactly
// one caller can hold it at a time, because the grant is a single atomic findOneAndUpdate that
// only matches when the lease is unheld or expired. Everyone else skips that run.
//
// The lease EXPIRES rather than being held forever, so a crashed run doesn't deadlock the next
// scheduled attempt — the following run after expiry can claim it. The lease duration should
// therefore exceed the job's realistic runtime but stay well under its interval.

const mongoose = require('mongoose')

const leaseSchema = new mongoose.Schema({
    _id: String,            // the job name
    holder: String,         // which run held it, for debugging
    expiresAt: Date,
}, { versionKey: false })

const JobLease = mongoose.models.joblocks || mongoose.model('joblocks', leaseSchema, 'joblocks')

// identifies this run in the lease document sir — purely diagnostic, the correctness comes from
// the atomic update, not from this value
const INSTANCE_ID = `${process.env.GITHUB_RUN_ID || process.env.HOSTNAME || 'local'}-${process.pid}`

/**
 * Runs `task` only if this caller wins the lease for `jobName`.
 *
 * @param {string} jobName        unique name for the scheduled job
 * @param {number} leaseMs        how long the lease is held; must exceed the task's runtime
 * @param {() => Promise<void>} task
 * @returns {Promise<{ status: 'ran'|'skipped'|'failed', error?: string }>} 'skipped' means
 *   another caller held the lease (expected, not an error); 'failed' means the lease/DB itself
 *   errored or task() threw — `error` carries the message so callers can report/alert on it.
 */
const runWithLease = async (jobName, leaseMs, task) => {
    if (mongoose.connection?.readyState !== 1) {
        console.log(`skipping scheduled job "${jobName}", no database connection`)
        return { status: 'failed', error: 'no database connection' }
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + leaseMs)

    let acquired = false
    try {
        // the whole mechanism sir: this matches ONLY when the lease is unheld or has expired.
        // Mongo applies it atomically, so with two callers racing, exactly one update succeeds
        // and the other matches nothing.
        const result = await JobLease.findOneAndUpdate(
            {
                _id: jobName,
                $or: [
                    { expiresAt: { $lt: now } },
                    { expiresAt: null },
                ],
            },
            { $set: { holder: INSTANCE_ID, expiresAt } },
            { upsert: true, returnDocument: 'after' }
        )
        acquired = !!result
    } catch (err) {
        // upsert races throw a duplicate-key error when another caller inserted first sir —
        // that's the lease working as intended, not a failure. Anything else is worth logging.
        if (err.code === 11000) return { status: 'skipped' }
        console.log(`failed to acquire job lease "${jobName}":`, err.message)
        return { status: 'failed', error: err.message }
    }

    if (!acquired) return { status: 'skipped' }

    try {
        await task()
        return { status: 'ran' }
    } catch (err) {
        console.log(`scheduled job "${jobName}" failed:`, err.message)
        return { status: 'failed', error: err.message }
    } finally {
        // release early so a fast run doesn't block the next one sir. If the process dies before
        // reaching this, the lease simply expires on its own.
        try {
            await JobLease.updateOne({ _id: jobName, holder: INSTANCE_ID }, { $set: { expiresAt: new Date() } })
        } catch (err) {
            console.log(`failed to release job lease "${jobName}", it will expire on its own:`, err.message)
        }
    }
}

module.exports = { runWithLease, INSTANCE_ID }
