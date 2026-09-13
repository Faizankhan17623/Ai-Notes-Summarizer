const { emailLayout, emailStyles } = require('./EmailLayout')

const otpEmail = (otp) => emailLayout(`
    <h2 style="${emailStyles.heading}">Verify your email</h2>
    <p style="${emailStyles.text}">Use the code below to finish creating your Notewise account. This code expires in 5 minutes.</p>
    <div style="${emailStyles.codeBlock}">${otp}</div>
    <p style="${emailStyles.muted}">If you did not request this, you can safely ignore this email.</p>
`)

module.exports = { otpEmail }
