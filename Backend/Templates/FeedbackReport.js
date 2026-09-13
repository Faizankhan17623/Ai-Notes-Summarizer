const { emailLayout, emailStyles } = require('./EmailLayout')

const TYPE_LABEL = { bug: 'Bug report', feature: 'Feature suggestion' }

// user-supplied title/description/route are untrusted sir, same reasoning as
// contactMessageTemplate's escapeHtml — must be escaped before landing in an HTML email
const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// notifies the site owner sir — mirrors contactMessageTemplate's shape, plus the fields
// unique to this form (route, screenshot) that a plain contact message doesn't have
const feedbackReportTemplate = (type, report) => {
    const submitterName = `${escapeHtml(report.submittedBy.firstName)} ${escapeHtml(report.submittedBy.lastName)}`
    return emailLayout(`
        <h2 style="${emailStyles.heading}">New ${TYPE_LABEL[type].toLowerCase()}</h2>
        <p style="${emailStyles.text}"><strong>From:</strong> ${submitterName} (${escapeHtml(report.submittedBy.email)})</p>
        <p style="${emailStyles.text}"><strong>Title:</strong> ${escapeHtml(report.title)}</p>
        ${report.route ? `<p style="${emailStyles.text}"><strong>Page:</strong> <code style="background:#f0f0f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(report.route)}</code></p>` : ''}
        <p style="${emailStyles.text} white-space: pre-wrap;">${escapeHtml(report.description)}</p>
        ${report.screenshotUrl ? `<a href="${encodeURI(report.screenshotUrl)}" style="${emailStyles.text} color: #0057d9;">View attached screenshot</a>` : ''}
    `)
}

// the reply the submitter receives sir — quotes the original title/type back for context,
// same shape as contactReplyTemplate
const feedbackReplyTemplate = (firstName, type, title, replyMessage) => emailLayout(`
    <h2 style="${emailStyles.heading}">We replied to your ${TYPE_LABEL[type].toLowerCase()}</h2>
    <p style="${emailStyles.text}">Hi ${escapeHtml(firstName)},</p>
    <p style="${emailStyles.text} white-space: pre-wrap;">${escapeHtml(replyMessage)}</p>
    <div style="${emailStyles.calloutBox}">
        <p style="color: #888888; font-size: 12px; margin: 0 0 4px;">Your ${TYPE_LABEL[type].toLowerCase()}:</p>
        <p style="color: #666666; font-size: 13px; margin: 0;">${escapeHtml(title)}</p>
    </div>
`)

module.exports = { feedbackReportTemplate, feedbackReplyTemplate }
