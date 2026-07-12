// shared daily-streak logic sir — used by any action that should count as "studying today"
// (flashcard review, quiz attempt, new note). Same calendar-day check by UTC date string, not
// a 24h delta, so "yesterday 11pm then today 1am" correctly counts as two different days.
const dayKey = (d) => d.toISOString().slice(0, 10)

// mutates and saves the given user document's streak fields sir — caller passes a doc already
// fetched with at least currentStreak, lastStreakDate, longestStreak selected
const recordStudyActivity = async (user) => {
    const today = new Date()

    if (!user.lastStreakDate) {
        user.currentStreak = 1
    } else {
        const last = dayKey(user.lastStreakDate)
        const now = dayKey(today)
        if (last !== now) {
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
            user.currentStreak = last === dayKey(yesterday) ? user.currentStreak + 1 : 1
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
