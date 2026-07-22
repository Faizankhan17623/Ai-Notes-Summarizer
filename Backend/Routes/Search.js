const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { searchAll } = require('../controllers/Search.js')

route.get('/search', Auth, blockIfBanned, searchAll)

module.exports = route
