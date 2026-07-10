const weeklyDigestTemplate = (name, data, dashboardUrl) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">Your week in notes</h2>
        <p style="color: #444; font-size: 15px;">Hi ${name}, here's what happened this week:</p>
        <ul style="color: #444; font-size: 14px; line-height: 1.8;">
            <li>${data.notesThisWeek} note${data.notesThisWeek === 1 ? '' : 's'} summarized</li>
            <li>${data.chatsThisWeek} chat message${data.chatsThisWeek === 1 ? '' : 's'} sent</li>
            <li>${data.dueFlashcards} flashcard${data.dueFlashcards === 1 ? '' : 's'} due for review</li>
            <li>${data.quizzesTaken} quiz${data.quizzesTaken === 1 ? '' : 'zes'} completed</li>
        </ul>
        <a href="${dashboardUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Open your dashboard</a>
        <p style="color: #888; font-size: 13px;">You're getting this because you have digest emails enabled. Turn them off anytime from your account settings.</p>
    </div>
`

module.exports = { weeklyDigestTemplate }
