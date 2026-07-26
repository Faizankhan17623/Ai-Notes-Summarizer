// shared branded shell sir — every template in this folder renders its own inner content,
// then wraps it with this so all outbound mail shares one consistent look (logo header, the
// app's actual yellow-50 brand accent, a plain-language footer) instead of each template being
// its own bare unbranded card. Inline styles only, table-based layout for the header/footer
// bars — email clients (Outlook/Gmail) strip <style> blocks and don't reliably support flexbox,
// so this deliberately avoids anything that only works in a real browser.
//
// bodyHtml is trusted, pre-built HTML from the calling template sir — this layout does no
// escaping itself; each template is responsible for escaping any user-submitted text before
// it reaches here (see contactMessageTemplate's escapeHtml for the one template that needs it)
const BRAND_YELLOW = '#ffd60a'
const INK = '#111111'
const BODY_TEXT = '#444444'
const MUTED = '#888888'
const BORDER = '#eeeeee'

const emailLayout = (bodyHtml) => `
<div style="background: #f6f6f4; padding: 32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid ${BORDER}; border-radius: 10px; overflow: hidden;">
        <tr>
            <td style="padding: 22px 28px; border-bottom: 3px solid ${BRAND_YELLOW};">
                <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: bold; color: ${INK};">Notewise</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 28px; font-family: Arial, Helvetica, sans-serif;">
                ${bodyHtml}
            </td>
        </tr>
        <tr>
            <td style="padding: 16px 28px; background: #fafaf9; border-top: 1px solid ${BORDER}; font-family: Arial, Helvetica, sans-serif;">
                <p style="color: ${MUTED}; font-size: 12px; margin: 0;">Notewise — AI-powered note summaries, flashcards, and study tools.</p>
            </td>
        </tr>
    </table>
</div>
`

// shared piece styles sir — templates import these instead of repeating the same hex codes,
// so a future brand-color change happens in one place
const emailStyles = {
    heading: `color: ${INK}; font-size: 20px; margin: 0 0 16px;`,
    text: `color: ${BODY_TEXT}; font-size: 15px; line-height: 1.6; margin: 0 0 14px;`,
    muted: `color: ${MUTED}; font-size: 13px; line-height: 1.5; margin: 14px 0 0;`,
    button: `display: inline-block; margin: 8px 0 4px; padding: 12px 24px; background: ${INK}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;`,
    codeBlock: `font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 24px 0; color: ${INK}; font-family: Arial, Helvetica, sans-serif;`,
    calloutBox: `margin-top: 16px; padding: 14px; background: #fafaf9; border: 1px solid ${BORDER}; border-radius: 8px;`,
    badge: `display: inline-block; padding: 4px 10px; background: ${BRAND_YELLOW}22; color: #7a5d00; border-radius: 999px; font-size: 13px; font-weight: bold;`,
}

module.exports = { emailLayout, emailStyles, BRAND_YELLOW }
