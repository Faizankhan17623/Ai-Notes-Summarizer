const passwordResetTemplate = (name, url) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">Reset your password</h2>
        <p style="color: #444; font-size: 15px;">Hi ${name},</p>
        <p style="color: #444; font-size: 15px;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
        <a href="${url}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Reset Password</a>
        <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
    </div>
    `
}

module.exports = { passwordResetTemplate }
