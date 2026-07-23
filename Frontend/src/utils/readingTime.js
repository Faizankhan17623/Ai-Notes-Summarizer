// pure word-count math sir — no AI/API call, same 200wpm baseline most reading-time widgets
// (Medium, etc.) use. Takes the note's rawText, not the summary — that's what the user
// would actually be reading/skimming if they opened the source.
const WORDS_PER_MINUTE = 200

export const estimateReadingMinutes = (text) => {
    if (!text) return 0
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export const formatReadingTime = (text) => {
    const minutes = estimateReadingMinutes(text)
    return `${minutes} min read`
}
