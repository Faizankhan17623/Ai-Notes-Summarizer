const { emailLayout, emailStyles } = require('./EmailLayout')

// jobName/errorMessage come from Backend/jobs/runJob.js sir — internal identifiers and a caught
// Error's .message, never user input, so no escaping needed here (contrast contactMessageTemplate,
// which does escape, because that one renders text a stranger typed into a form)
const jobFailedEmail = (jobName, errorMessage, runUrl) => emailLayout(`
    <h2 style="${emailStyles.heading}">Scheduled job failed: ${jobName}</h2>
    <p style="${emailStyles.text}">The "${jobName}" cron job failed on GitHub Actions and did not complete.</p>
    <div style="${emailStyles.calloutBox}">
        <p style="${emailStyles.muted}" style="margin:0;"><strong>Error:</strong> ${errorMessage || 'Unknown error — see the Actions log.'}</p>
    </div>
    ${runUrl ? `<p style="${emailStyles.text}"><a href="${runUrl}" style="${emailStyles.button}">View the run</a></p>` : ''}
    <p style="${emailStyles.muted}">This job will retry on its next scheduled run. Check the admin dashboard's System Health page for the current status.</p>
`)

module.exports = { jobFailedEmail }
