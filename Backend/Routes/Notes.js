const express = require('express')
const route = express.Router()
const { Calling } = require('../controllers/AI')
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { organizeNoteRules, summarizeRules } = require('../Middlewares/ValidationRules.js')
const {
    getNotes,
    getTags,
    getNote,
    deleteNote,
    organizeNote,
    enableShare,
    disableShare,
    getSharedNote,
    getRelatedNotes,
} = require('../controllers/Notes.js')
const { exportNote } = require('../controllers/Export.js')

// aiLimiter because every call here burns a Groq request + a credit sir
route.post('/summarize', aiLimiter, doubleCsrfProtection, summarizeRules, validate, Auth, blockIfBanned, Calling)

// public sir — no auth, no rate limit beyond the global one. NOTE: must be registered before
// /notes/:noteId below, otherwise Express reads "shared" as a shareId param on the wrong route
route.get('/shared/:shareId', getSharedNote)

route.get('/notes', Auth, blockIfBanned, getNotes)
// must come before /notes/:noteId sir — same reason as above, "tags" would otherwise be read as a noteId
route.get('/notes/tags', Auth, blockIfBanned, getTags)
route.get('/notes/:noteId', Auth, blockIfBanned, getNote)
route.get('/notes/:noteId/related', Auth, blockIfBanned, getRelatedNotes)
route.delete('/notes/:noteId', doubleCsrfProtection, Auth, blockIfBanned, deleteNote)
route.patch('/notes/:noteId/organize', doubleCsrfProtection, organizeNoteRules, validate, Auth, blockIfBanned, organizeNote)
route.post('/notes/:noteId/share', doubleCsrfProtection, Auth, blockIfBanned, enableShare)
route.delete('/notes/:noteId/share', doubleCsrfProtection, Auth, blockIfBanned, disableShare)
route.get('/notes/:noteId/export/:format', Auth, blockIfBanned, exportNote)

module.exports = route
