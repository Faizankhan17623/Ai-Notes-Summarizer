const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { createChatRules, sendMessageRules } = require('../Middlewares/ValidationRules.js')
const {
    createChat,
    sendMessage,
    getChats,
    getChat,
    deleteChat
} = require('../controllers/Chat.js')

route.post('/chat', doubleCsrfProtection, createChatRules, validate, Auth, createChat)
// this one hits Groq sir so it gets the AI rate limit
route.post('/chat/:chatId/message', aiLimiter, doubleCsrfProtection, sendMessageRules, validate, Auth, sendMessage)
route.get('/chat', Auth, getChats)
route.get('/chat/:chatId', Auth, getChat)
route.delete('/chat/:chatId', doubleCsrfProtection, Auth, deleteChat)

module.exports = route
