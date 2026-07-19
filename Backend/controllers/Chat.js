const mongoose = require('mongoose')
const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const User = require('../Models/User')

const { getUserPlan, DEFAULT_MODEL } = require('../utils/Plans')
const { buildChatSystemPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
// fallback for how many past messages we replay sir — the real number comes from the user's plan
const CONTEXT_WINDOW = 10

// POST /chat — start a new chat grounded in an existing saved note sir (no credit cost — the note was already paid for)
exports.createChat = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId } = req.body

        if (!noteId || !mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid note id is required to start a chat',
            })
        }

        const note = await Note.findOne({ _id: noteId, user: id })
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found',
            })
        }

        const chat = await Chat.create({
            user: id,
            note: note._id,
            title: note.title,
            messages: []
        })

        await User.findByIdAndUpdate(id, { $push: { Chats: chat._id } })

        return res.status(201).json({
            success: true,
            message: 'Chat created successfully',
            chatId: chat._id,
            title: chat.title
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating the chat',
        })
    }
}

// POST /chat/:chatId/message — send a message and get the AI reply sir
exports.sendMessage = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params
        const message = req.body.message

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message is required',
            })
        }

        // filtering by user too so nobody can talk in someone else's chat sir
        const chat = await Chat.findOne({ _id: chatId, user: id })
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        const note = await Note.findById(chat.note)
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'The note behind this chat no longer exists',
            })
        }

        // cap the chat length by the user's plan sir — Basic 60, Pro 200, ProMax 500
        const plan = await getUserPlan(id)
        if (plan && plan.maxMessagesPerChat !== null && chat.messages.length >= plan.maxMessagesPerChat) {
            return res.status(403).json({
                success: false,
                message: 'This chat is full for your plan, please start a new chat or upgrade your plan',
            })
        }

        const contextWindow = plan?.contextWindow || CONTEXT_WINDOW
        const Messages = [
            {
                role: 'system',
                content: buildChatSystemPrompt(plan?.key, note.rawText)
            },
            ...chat.messages.slice(-contextWindow).map((m) => ({
                role: m.role,
                content: m.content
            })),
            {
                role: 'user',
                content: message.trim()
            }
        ]

        const t0 = Date.now()
        let Invoking
        try {
            Invoking = await groq.chat.completions.create({
                messages: Messages,
                model: plan?.model || DEFAULT_MODEL,
                temperature: 0.5,
            })
            logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: plan?.model || DEFAULT_MODEL, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: plan?.model || DEFAULT_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = Invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty response, please try again',
            })
        }

        if (raw.includes('</think>')) {
            raw = raw.split('</think>').pop()
        }
        raw = raw.trim()

        chat.messages.push({ role: 'user', content: message.trim() })
        chat.messages.push({ role: 'assistant', content: raw })
        await chat.save()

        return res.status(200).json({
            success: true,
            reply: raw
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending the message',
        })
    }
}

// POST /chat/:chatId/regenerate — re-ask the same last user message, replacing the
// last assistant reply in place rather than appending a duplicate exchange sir
exports.regenerateReply = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        const chat = await Chat.findOne({ _id: chatId, user: id })
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        const last = chat.messages[chat.messages.length - 1]
        if (!last || last.role !== 'assistant') {
            return res.status(400).json({
                success: false,
                message: 'There is no reply to regenerate yet',
            })
        }

        const note = await Note.findById(chat.note)
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'The note behind this chat no longer exists',
            })
        }

        // drop the reply being replaced sir — everything up to and including the last
        // user message stays as the prompt history, same as a normal sendMessage call
        const historyWithoutLastReply = chat.messages.slice(0, -1)

        const plan = await getUserPlan(id)
        const contextWindow = plan?.contextWindow || CONTEXT_WINDOW
        const Messages = [
            {
                role: 'system',
                content: buildChatSystemPrompt(plan?.key, note.rawText)
            },
            ...historyWithoutLastReply.slice(-contextWindow).map((m) => ({
                role: m.role,
                content: m.content
            })),
        ]

        const t0 = Date.now()
        let Invoking
        try {
            Invoking = await groq.chat.completions.create({
                messages: Messages,
                model: plan?.model || DEFAULT_MODEL,
                temperature: 0.5,
            })
            logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: plan?.model || DEFAULT_MODEL, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: plan?.model || DEFAULT_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = Invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty response, please try again',
            })
        }

        if (raw.includes('</think>')) {
            raw = raw.split('</think>').pop()
        }
        raw = raw.trim()

        chat.messages = historyWithoutLastReply
        chat.messages.push({ role: 'assistant', content: raw })
        await chat.save()

        return res.status(200).json({
            success: true,
            reply: raw
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while regenerating the reply',
        })
    }
}

// GET /chat — the user's chat list for the sidebar sir
exports.getChats = async (req, res) => {
    try {
        const id = req.User.id

        const chats = await Chat.find({ user: id })
            .select('title note updatedAt createdAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            chats
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the chats',
        })
    }
}

// GET /chat/:chatId — full message history of one chat sir
exports.getChat = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        const chat = await Chat.findOne({ _id: chatId, user: id })
            .select('title note messages createdAt updatedAt')

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        return res.status(200).json({
            success: true,
            chat
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the chat',
        })
    }
}

// DELETE /chat/:chatId — remove a chat and unlink it from the user sir
exports.deleteChat = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chat id',
            })
        }

        const chat = await Chat.findOneAndDelete({ _id: chatId, user: id })
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
            })
        }

        await User.findByIdAndUpdate(id, { $pull: { Chats: chat._id } })

        return res.status(200).json({
            success: true,
            message: 'Chat deleted successfully',
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting the chat',
        })
    }
}
