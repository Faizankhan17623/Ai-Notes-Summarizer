const express = require('express')
const route = express.Router()
const { Auth, blockIfBanned } = require('../Middlewares/Auth.js')
const { aiLimiter, chatLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { createChatRules, sendMessageRules, regenerateReplyRules } = require('../Middlewares/ValidationRules.js')
const {
    createChat,
    sendMessage,
    regenerateReply,
    sendMessageStream,
    regenerateReplyStream,
    sendVoiceMessageStream,
    getChats,
    getChat,
    deleteChat
} = require('../controllers/Chat.js')

route.post('/chat', doubleCsrfProtection, createChatRules, validate, Auth, blockIfBanned, createChat)
// this one hits Groq sir so it gets the tighter chat-specific rate limit (also now metered
// per-user by consumeChatMessage inside the controller — see utils/Plans.js)
route.post('/chat/:chatId/message', chatLimiter, doubleCsrfProtection, sendMessageRules, validate, Auth, blockIfBanned, sendMessage)
// also hits Groq sir — same rate limit as sending a message
route.post('/chat/:chatId/regenerate', chatLimiter, doubleCsrfProtection, regenerateReplyRules, validate, Auth, blockIfBanned, regenerateReply)
// streamed versions sir — same middleware chain, reply comes back over SSE token-by-token
route.post('/chat/:chatId/message/stream', chatLimiter, doubleCsrfProtection, sendMessageRules, validate, Auth, blockIfBanned, sendMessageStream)
route.post('/chat/:chatId/regenerate/stream', chatLimiter, doubleCsrfProtection, regenerateReplyRules, validate, Auth, blockIfBanned, regenerateReplyStream)
// voice-mode Q&A sir — no body to validate (the message is an uploaded audio file, validated
// inside extractFromAudio itself), but it still hits Groq twice (Whisper + chat) so it keeps
// the same rate limit + CSRF protection as every other state-changing chat route
route.post('/chat/:chatId/message/voice', aiLimiter, doubleCsrfProtection, Auth, blockIfBanned, sendVoiceMessageStream)
route.get('/chat', Auth, blockIfBanned, getChats)
route.get('/chat/:chatId', Auth, blockIfBanned, getChat)
route.delete('/chat/:chatId', doubleCsrfProtection, Auth, blockIfBanned, deleteChat)

module.exports = route
