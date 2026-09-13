const { emailLayout, emailStyles } = require('./EmailLayout')

// anyone can submit this form sir — name/message are untrusted, unlike the account-derived
// fields other templates use (e.g. passwordResetTemplate's user.firstName), so this is the
// first template that actually needs HTML-escaping before interpolating into the email body
const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const contactMessageTemplate = (name, email, message) => emailLayout(`
    <h2 style="${emailStyles.heading}">New contact form submission</h2>
    <p style="${emailStyles.text}"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
    <p style="${emailStyles.text} white-space: pre-wrap;">${escapeHtml(message)}</p>
`)

// the reply the ORIGINAL submitter receives sir — quotes their message back so they have
// context (this could be days later and they may not remember exactly what they wrote)
const contactReplyTemplate = (name, originalMessage, replyMessage) => emailLayout(`
    <h2 style="${emailStyles.heading}">We replied to your message</h2>
    <p style="${emailStyles.text}">Hi ${escapeHtml(name)},</p>
    <p style="${emailStyles.text} white-space: pre-wrap;">${escapeHtml(replyMessage)}</p>
    <div style="${emailStyles.calloutBox}">
        <p style="color: #888888; font-size: 12px; margin: 0 0 4px;">Your original message:</p>
        <p style="color: #666666; font-size: 13px; white-space: pre-wrap; margin: 0;">${escapeHtml(originalMessage)}</p>
    </div>
`)

module.exports = { contactMessageTemplate, contactReplyTemplate }
