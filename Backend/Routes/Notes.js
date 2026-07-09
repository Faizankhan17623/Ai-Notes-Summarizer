const express = require('express')
const route = express.Router()
const { Calling } = require('../controllers/AI')
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { organizeNoteRules } = require('../Middlewares/ValidationRules.js')
const {
    getNotes,
    getTags,
    getNote,
    deleteNote,
    organizeNote,
    enableShare,
    disableShare,
    getSharedNote,
} = require('../controllers/Notes.js')
const { exportNote } = require('../controllers/Export.js')

// aiLimiter because every call here burns a Groq request + a credit sir
route.post('/summarize', aiLimiter, doubleCsrfProtection, Auth, Calling)

// public sir — no auth, no rate limit beyond the global one. NOTE: must be registered before
// /notes/:noteId below, otherwise Express reads "shared" as a shareId param on the wrong route
route.get('/shared/:shareId', getSharedNote)

route.get('/notes', Auth, getNotes)
// must come before /notes/:noteId sir — same reason as above, "tags" would otherwise be read as a noteId
route.get('/notes/tags', Auth, getTags)
route.get('/notes/:noteId', Auth, getNote)
route.delete('/notes/:noteId', doubleCsrfProtection, Auth, deleteNote)
route.patch('/notes/:noteId/organize', doubleCsrfProtection, organizeNoteRules, validate, Auth, organizeNote)
route.post('/notes/:noteId/share', doubleCsrfProtection, Auth, enableShare)
route.delete('/notes/:noteId/share', doubleCsrfProtection, Auth, disableShare)
route.get('/notes/:noteId/export/:format', Auth, exportNote)

module.exports = route
