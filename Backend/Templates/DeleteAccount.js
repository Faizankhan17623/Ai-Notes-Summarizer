const deleteAccountEmail = (email, firstName, lastName, bufferTiming) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">Your account is scheduled for deletion</h2>
        <p style="color: #444; font-size: 15px;">Hi ${firstName} ${lastName},</p>
        <p style="color: #444; font-size: 15px;">We're sorry to see you go. Your account (${email}) will be permanently deleted on <strong>${bufferTiming}</strong>.</p>
        <p style="color: #444; font-size: 15px;">Changed your mind? Just log back in before that date to instantly recover your account.</p>
    </div>
    `
}

module.exports = { deleteAccountEmail }
