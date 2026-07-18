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

module.exports = { contactMessageTemplate }
