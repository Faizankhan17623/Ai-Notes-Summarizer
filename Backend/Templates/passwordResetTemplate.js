const { emailLayout, emailStyles } = require('./EmailLayout')

const passwordResetTemplate = (name, url) => emailLayout(`
    <h2 style="${emailStyles.heading}">Reset your password</h2>
    <p style="${emailStyles.text}">Hi ${name},</p>
    <p style="${emailStyles.text}">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
    <a href="${url}" style="${emailStyles.button}">Reset password</a>
    <p style="${emailStyles.muted}">If you did not request this, you can safely ignore this email.</p>
`)

module.exports = { passwordResetTemplate }
