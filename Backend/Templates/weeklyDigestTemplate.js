const { emailLayout, emailStyles } = require('./EmailLayout')

const weeklyDigestTemplate = (name, data, dashboardUrl) => emailLayout(`
    <h2 style="${emailStyles.heading}">Your week in notes</h2>
    <p style="${emailStyles.text}">Hi ${name}, here's what happened this week:</p>
    <ul style="color: #444444; font-size: 14px; line-height: 1.8; margin: 0 0 14px; padding-left: 20px;">
        <li>${data.notesThisWeek} note${data.notesThisWeek === 1 ? '' : 's'} summarized</li>
        <li>${data.chatsThisWeek} chat message${data.chatsThisWeek === 1 ? '' : 's'} sent</li>
        <li>${data.dueFlashcards} flashcard${data.dueFlashcards === 1 ? '' : 's'} due for review</li>
        <li>${data.quizzesTaken} quiz${data.quizzesTaken === 1 ? '' : 'zes'} completed</li>
    </ul>
    <a href="${dashboardUrl}" style="${emailStyles.button}">Open your dashboard</a>
    <p style="${emailStyles.muted}">You're getting this because you have digest emails enabled. Turn them off anytime from your account settings.</p>
`)

module.exports = { weeklyDigestTemplate }
