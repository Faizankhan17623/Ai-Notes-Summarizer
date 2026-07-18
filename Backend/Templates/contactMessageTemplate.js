// anyone can submit this form sir — name/message are untrusted, unlike the account-derived
// fields other templates use (e.g. passwordResetTemplate's user.firstName), so this is the
// first template that actually needs HTML-escaping before interpolating into the email body
const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const contactMessageTemplate = (name, email, message) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">New contact form submission</h2>
        <p style="color: #444; font-size: 15px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
        <p style="color: #444; font-size: 15px; white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
    `
}

// the reply the ORIGINAL submitter receives sir — quotes their message back so they have
// context (this could be days later and they may not remember exactly what they wrote)
const contactReplyTemplate = (name, originalMessage, replyMessage) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">We replied to your message</h2>
        <p style="color: #444; font-size: 15px;">Hi ${escapeHtml(name)},</p>
        <p style="color: #444; font-size: 15px; white-space: pre-wrap;">${escapeHtml(replyMessage)}</p>
        <div style="margin-top: 20px; padding: 12px; background: #f7f7f7; border-radius: 6px;">
            <p style="color: #888; font-size: 12px; margin: 0 0 4px;">Your original message:</p>
            <p style="color: #666; font-size: 13px; white-space: pre-wrap; margin: 0;">${escapeHtml(originalMessage)}</p>
        </div>
    </div>
    `
}

module.exports = { contactMessageTemplate, contactReplyTemplate }
