const express = require('express')
const route = express.Router()
const { Calling } = require('../controllers/AI')
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { organizeNoteRules, summarizeRules, bulkDeleteNotesRules, bulkAddTagRules, editNoteRules, getNoteVersionsRules, restoreNoteVersionRules } = require('../Middlewares/ValidationRules.js')
const {
    getNotes,
    getTags,
    importNote,
    getNote,
    deleteNote,
    organizeNote,
    editNote,
    getNoteVersions,
    restoreNoteVersion,
    enableShare,
    disableShare,
    getSharedNote,
    getRelatedNotes,
    bulkDeleteNotes,
    bulkAddTag,
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
// no aiLimiter sir — this is deliberately NOT an AI call (no Groq request, no credit/feature
// spend), that's the entire point of import. globalLimiter is the only rate limit that applies.
// Must come before /notes/:noteId too, same ordering reason as /notes/tags above.
route.post('/notes/import', doubleCsrfProtection, Auth, blockIfBanned, importNote)
// bulk routes sir — same ordering requirement as /notes/tags above, "bulk"/"bulk-tag" would
// otherwise be read as a noteId by the :noteId route below
route.delete('/notes/bulk', doubleCsrfProtection, bulkDeleteNotesRules, validate, Auth, blockIfBanned, bulkDeleteNotes)
route.patch('/notes/bulk-tag', doubleCsrfProtection, bulkAddTagRules, validate, Auth, blockIfBanned, bulkAddTag)
route.get('/notes/:noteId', Auth, blockIfBanned, getNote)
route.get('/notes/:noteId/related', Auth, blockIfBanned, getRelatedNotes)
route.delete('/notes/:noteId', doubleCsrfProtection, Auth, blockIfBanned, deleteNote)
route.patch('/notes/:noteId/organize', doubleCsrfProtection, organizeNoteRules, validate, Auth, blockIfBanned, organizeNote)
route.patch('/notes/:noteId/edit', doubleCsrfProtection, editNoteRules, validate, Auth, blockIfBanned, editNote)
route.get('/notes/:noteId/versions', getNoteVersionsRules, validate, Auth, blockIfBanned, getNoteVersions)
route.post('/notes/:noteId/versions/:versionId/restore', doubleCsrfProtection, restoreNoteVersionRules, validate, Auth, blockIfBanned, restoreNoteVersion)
route.post('/notes/:noteId/share', doubleCsrfProtection, Auth, blockIfBanned, enableShare)
route.delete('/notes/:noteId/share', doubleCsrfProtection, Auth, blockIfBanned, disableShare)
route.get('/notes/:noteId/export/:format', Auth, blockIfBanned, exportNote)

module.exports = route
