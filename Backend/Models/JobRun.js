const mongoose = require('mongoose')

// one row per GitHub Actions cron job attempt sir — weekly-digest / plan-expiry-warnings.
// Written by Backend/jobs/runJob.js (a standalone process, no HTTP server) directly via
// Mongoose, same access pattern utils/jobLease.js already uses. Read back by the
// GET /admin/health controller so a failed run shows up on the admin dashboard, not just in a
// GitHub Actions log nobody's watching.
const jobRunSchema = new mongoose.Schema(
    {
        jobName: {
            type: String,
            required: true,
        },
        result: {
            type: String,
            enum: ['ran', 'failed'],
            required: true,
        },
        startedAt: {
            type: Date,
            required: true,
        },
        finishedAt: {
            type: Date,
            required: true,
        },
        error: {
            type: String,
        },
        // GitHub Actions run id when available sir, for jumping straight to the log — see
        // utils/jobLease.js's INSTANCE_ID for the same env var
        runId: {
            type: String,
        },
    },
    { timestamps: true }
)

// health controller only ever wants the latest row per job sir
jobRunSchema.index({ jobName: 1, createdAt: -1 })

module.exports = mongoose.model('JobRun', jobRunSchema)
