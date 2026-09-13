// pure-text similarity sir — no AI/embedding call, this is Jaccard similarity over 5-word
// shingles, the same technique behind classic plagiarism/near-duplicate detectors before
// embeddings existed. Good enough to flag "you basically pasted this again," not meant to
// catch paraphrasing.

const SHINGLE_SIZE = 5

// lowercased, punctuation-stripped, whitespace-collapsed word list sir
const tokenize = (text) => text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

// set of "word1 word2 word3 word4 word5" shingles sir — sliding window over the token list.
// Short texts (fewer than SHINGLE_SIZE words) fall back to a single shingle of everything
// they have, so a two-word note can still be compared instead of producing an empty set.
const shingles = (text) => {
    const tokens = tokenize(text)
    if (tokens.length === 0) return new Set()
    if (tokens.length < SHINGLE_SIZE) return new Set([tokens.join(' ')])

    const set = new Set()
    for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
        set.add(tokens.slice(i, i + SHINGLE_SIZE).join(' '))
    }
    return set
}

// |intersection| / |union| sir — 0 (nothing shared) to 1 (identical shingle sets)
const jaccardSimilarity = (setA, setB) => {
    if (setA.size === 0 || setB.size === 0) return 0
    let intersection = 0
    for (const s of setA) {
        if (setB.has(s)) intersection++
    }
    const union = setA.size + setB.size - intersection
    return union === 0 ? 0 : intersection / union
}

module.exports = { shingles, jaccardSimilarity }
