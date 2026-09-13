const { emailLayout, emailStyles } = require('./EmailLayout')

const deleteAccountEmail = (email, firstName, lastName, bufferTiming) => emailLayout(`
    <h2 style="${emailStyles.heading}">Your account is scheduled for deletion</h2>
    <p style="${emailStyles.text}">Hi ${firstName} ${lastName},</p>
    <p style="${emailStyles.text}">We're sorry to see you go. Your account (${email}) will be permanently deleted on <strong>${bufferTiming}</strong>.</p>
    <p style="${emailStyles.text}">Changed your mind? Just log back in before that date to instantly recover your account.</p>
`)

module.exports = { deleteAccountEmail }
