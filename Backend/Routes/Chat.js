const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { createChatRules, sendMessageRules, regenerateReplyRules } = require('../Middlewares/ValidationRules.js')
const {
    createChat,
    sendMessage,
    regenerateReply,
    getChats,
    getChat,
    deleteChat
} = require('../controllers/Chat.js')

route.post('/chat', doubleCsrfProtection, createChatRules, validate, Auth, createChat)
// this one hits Groq sir so it gets the AI rate limit
route.post('/chat/:chatId/message', aiLimiter, doubleCsrfProtection, sendMessageRules, validate, Auth, sendMessage)
// also hits Groq sir — same rate limit as sending a message
route.post('/chat/:chatId/regenerate', aiLimiter, doubleCsrfProtection, regenerateReplyRules, validate, Auth, regenerateReply)
route.get('/chat', Auth, getChats)
route.get('/chat/:chatId', Auth, getChat)
route.delete('/chat/:chatId', doubleCsrfProtection, Auth, deleteChat)

module.exports = route
