const express = require('express')
const route = express.Router()
const { Calling } = require('../controllers/AI')
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { getNotes, getNote, deleteNote } = require('../controllers/Notes.js')

// aiLimiter because every call here burns a Groq request + a credit sir
route.post('/summarize', aiLimiter, Auth, Calling)

route.get('/notes', Auth, getNotes)
route.get('/notes/:noteId', Auth, getNote)
route.delete('/notes/:noteId', Auth, deleteNote)

module.exports = route
