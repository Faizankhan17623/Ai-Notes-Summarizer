const otpEmail = (otp) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">Verify your email</h2>
        <p style="color: #444; font-size: 15px;">Use the code below to finish creating your Notewise account. This code expires in 5 minutes.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 24px 0; color: #111;">${otp}</div>
        <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
    </div>
    `
}

module.exports = { otpEmail }
