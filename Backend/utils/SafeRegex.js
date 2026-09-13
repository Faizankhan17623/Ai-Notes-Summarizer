// escapes regex metacharacters sir — so search terms typed by a staff user (getUsers/getAiLogs
// in controllers/Admin.js) build a literal-substring RegExp instead of a pattern an attacker
// (or a compromised Support/Billing account) could shape into catastrophic backtracking and
// hang the event loop. Also caps input length, since even an escaped very-long term is still
// pointless work for a search box.
const MAX_SEARCH_LEN = 100

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// returns a safe case-insensitive "contains" RegExp for a raw user-supplied search term
const safeSearchRegex = (raw) => new RegExp(escapeRegex(raw.slice(0, MAX_SEARCH_LEN)), 'i')

module.exports = { escapeRegex, safeSearchRegex, MAX_SEARCH_LEN }
