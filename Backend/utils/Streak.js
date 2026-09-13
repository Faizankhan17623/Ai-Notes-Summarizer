// shared daily-streak logic sir — used by any action that should count as "studying today"
// (flashcard review, quiz attempt, new note). Calendar-day check by date string, not a 24h
// delta, so "yesterday 11pm then today 1am" correctly counts as two different days.
//
// `tzOffsetMinutes` is the user's browser UTC offset (same sign convention as JS's own
// Date.getTimezoneOffset() — e.g. IST/UTC+5:30 is -330), read off req.User by Middlewares/Auth.js
// and threaded through by every caller below. Defaults to 0 (UTC) for any caller that doesn't
// have it (external/API-key routes, background jobs with no request context) — so "today"
// means the user's real local day whenever we know it, UTC otherwise. Shifting the timestamp
// by the offset before slicing the date string is the standard trick for a fake-local Date
// whose calendar fields read out as local time via the UTC accessors.
const dayKey = (d, tzOffsetMinutes = 0) => new Date(d.getTime() - tzOffsetMinutes * 60 * 1000).toISOString().slice(0, 10)

// mutates and saves the given user document's streak fields sir — caller passes a doc already
// fetched with at least currentStreak, lastStreakDate, longestStreak selected
const recordStudyActivity = async (user, tzOffsetMinutes = 0) => {
    const today = new Date()

    if (!user.lastStreakDate) {
        user.currentStreak = 1
    } else {
        const last = dayKey(user.lastStreakDate, tzOffsetMinutes)
        const now = dayKey(today, tzOffsetMinutes)
        if (last !== now) {
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
            user.currentStreak = last === dayKey(yesterday, tzOffsetMinutes) ? user.currentStreak + 1 : 1
        }
        // else: already studied today sir — no change, this isn't a second day
    }
    user.lastStreakDate = today

    if (user.currentStreak > user.longestStreak) {
        user.longestStreak = user.currentStreak
    }

    await user.save()
    return user
}

module.exports = { recordStudyActivity, dayKey }
