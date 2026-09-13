// simplified SM-2 (the SuperMemo-2 algorithm behind Anki/most flashcard apps) sir
// rating is one of: 'again' | 'hard' | 'good' | 'easy'

// quality maps each rating to SM-2's 0-5 scale sir
const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 }

// given a card's current scheduling state + a rating, returns the next state sir
const schedule = (card, rating) => {
    const quality = QUALITY[rating] ?? QUALITY.good

    // a failed recall sir — reset the interval, review again tomorrow, no ease penalty beyond SM-2's own formula
    if (quality < 3) {
        return {
            easeFactor: Math.max(1.3, card.easeFactor - 0.2),
            interval: 1,
            reviewCount: 0,
            dueDate: addDays(1),
        }
    }

    // SM-2's ease adjustment formula sir — same for every successful recall, tuned by quality
    const nextEase = Math.max(
        1.3,
        card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    let nextInterval
    if (card.reviewCount === 0) nextInterval = 1
    else if (card.reviewCount === 1) nextInterval = 6
    else nextInterval = Math.round(card.interval * nextEase)

    return {
        easeFactor: nextEase,
        interval: nextInterval,
        reviewCount: card.reviewCount + 1,
        dueDate: addDays(nextInterval),
    }
}

const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

module.exports = { schedule }
