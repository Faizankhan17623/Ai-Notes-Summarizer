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

// resolves what to ground a chat's system prompt in sir — a single note's rawText (original
// shape, passed straight to buildChatSystemPrompt) for a normal chat, or an array of per-note
// { title, text } sections for a multi-note chat. Same 20k-char combined budget either way,
// split evenly across notes when there's more than one (same reasoning as generateExam).
const loadChatGrounding = async (chat) => {
    if (chat.notes?.length > 0) {
        const notes = await Note.find({ _id: { $in: chat.notes } }).select('title rawText')
        if (notes.length === 0) return null
        const notesById = new Map(notes.map((n) => [String(n._id), n]))
        const perNoteCap = Math.floor(20000 / chat.notes.length)
        return chat.notes
            .map((nid) => notesById.get(String(nid)))
            .filter(Boolean)
            .map((n) => ({ title: n.title, text: n.rawText.slice(0, perNoteCap) }))
    }

    const note = await Note.findById(chat.note)
    if (!note) return null
    // 20k-char cap sir — Groq free tier allows 8,000 tokens/min, and notes created before
    // AI.js's input cap can carry rawText far beyond that
    return note.rawText.slice(0, 20000)
}

const MAX_MULTI_NOTE_CHAT_NOTES = 10

// POST /chat — start a new chat grounded in either ONE note (`noteId`, original behavior) or
// SEVERAL notes at once (`noteIds`, multi-note chat) sir. No credit cost either way — the
// note(s) were already paid for at summarize time.
exports.createChat = async (req, res) => {
    try {
        const id = req.User.id
        const { noteId, noteIds } = req.body

        if (Array.isArray(noteIds) && noteIds.length > 0) {
            if (noteIds.length > MAX_MULTI_NOTE_CHAT_NOTES) {
                return res.status(400).json({
                    success: false,
                    message: `You can chat across at most ${MAX_MULTI_NOTE_CHAT_NOTES} notes at once`,
                })
            }
            if (noteIds.some((n) => !mongoose.isValidObjectId(n))) {
                return res.status(400).json({ success: false, message: 'Invalid note id in the list' })
            }

            const notes = await Note.find({ _id: { $in: noteIds }, user: id }).select('title')
            if (notes.length !== new Set(noteIds).size) {
                return res.status(404).json({ success: false, message: 'One or more of those notes could not be found' })
            }
            const notesById = new Map(notes.map((n) => [String(n._id), n]))
            const orderedNotes = [...new Set(noteIds)].map((nid) => notesById.get(nid))

            const title = orderedNotes.length === 1
                ? orderedNotes[0].title
                : `${orderedNotes[0].title} + ${orderedNotes.length - 1} more`

            const chat = await Chat.create({
                user: id,
                notes: orderedNotes.map((n) => n._id),
                title,
                messages: []
            })

            await User.findByIdAndUpdate(id, { $push: { Chats: chat._id } })

            return res.status(201).json({
                success: true,
                message: 'Chat created successfully',
                chatId: chat._id,
                title: chat.title
            })
        }

        if (!noteId || !mongoose.isValidObjectId(noteId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid note id (or list of note ids) is required to start a chat',
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

        const grounding = await loadChatGrounding(chat)
        if (!grounding) {
            return res.status(404).json({
                success: false,
                message: chat.notes?.length > 0
                    ? 'The notes behind this chat no longer exist'
                    : 'The note behind this chat no longer exists',
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
                content: buildChatSystemPrompt(plan?.key, grounding)
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
            // friendly message for Groq free-tier limit errors sir, same mapping as AI.js
            if (aiErr?.status === 413 || aiErr?.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: 'Our AI service is at its per-minute limit right now — please wait about a minute and try again',
                })
            }
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

        const grounding = await loadChatGrounding(chat)
        if (!grounding) {
            return res.status(404).json({
                success: false,
                message: chat.notes?.length > 0
                    ? 'The notes behind this chat no longer exist'
                    : 'The note behind this chat no longer exists',
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
                content: buildChatSystemPrompt(plan?.key, grounding)
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
            // friendly message for Groq free-tier limit errors sir, same mapping as AI.js
            if (aiErr?.status === 413 || aiErr?.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: 'Our AI service is at its per-minute limit right now — please wait about a minute and try again',
                })
            }
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
            .select('title note notes updatedAt createdAt')
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
            .select('title note notes messages createdAt updatedAt')
            .populate('notes', 'title')

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
