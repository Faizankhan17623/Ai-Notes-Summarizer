const { emailLayout, emailStyles } = require('./EmailLayout')

// role labels kept plain-English sir — 'User' and 'Support' are exactly the two values
// setRole ever accepts (see Backend/controllers/Admin.js), no other role can trigger this
const ROLE_DESCRIPTION = {
    User: 'a regular user',
    Support: 'a member of the support team',
}

const roleChangedEmail = (firstName, lastName, newRole) => {
    const description = ROLE_DESCRIPTION[newRole] || newRole
    return emailLayout(`
        <h2 style="${emailStyles.heading}">Your account role has changed</h2>
        <p style="${emailStyles.text}">Hi ${firstName} ${lastName},</p>
        <p style="${emailStyles.text}">Your Notewise account is now ${description} — <span style="${emailStyles.badge}">${newRole}</span></p>
        <p style="${emailStyles.muted}">If this wasn't expected, please contact us.</p>
    `)
}

module.exports = { roleChangedEmail }
