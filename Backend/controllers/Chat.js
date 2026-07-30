const mongoose = require('mongoose')
const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const Chat = require('../Models/Chat')
const User = require('../Models/User')

const { getUserPlan, consumeFeatureUsage, DEFAULT_MODEL } = require('../utils/Plans')
const { buildChatSystemPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { extractFromAudio } = require('../utils/Parsers')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
// fallback for how many past messages we replay sir — the real number comes from the user's plan
const CONTEXT_WINDOW = 10

// voice-mode TTS sir — Groq's playai-tts caps input at ~10k chars per call, so a very long
// reply gets split on sentence boundaries and synthesized in pieces, then concatenated back
// into one buffer (all pieces come back as the same WAV sample rate/format, so this is safe)
// playai-tts was decommissioned by Groq on 2026-12-31 sir — canopylabs/orpheus-v1-english is
// the current replacement (console.groq.com/docs/deprecations). This model requires one-time
// terms acceptance by the org admin at console.groq.com/playground?model=canopylabs%2Forpheus-v1-english
// before any request will succeed — do that before relying on this in production.
const TTS_MODEL = 'canopylabs/orpheus-v1-english'
const TTS_VOICE = process.env.GROQ_TTS_VOICE || 'hannah'
const TTS_MAX_CHARS = 9000

const chunkForTts = (text) => {
    if (text.length <= TTS_MAX_CHARS) return [text]
    const chunks = []
    let rest = text
    while (rest.length > TTS_MAX_CHARS) {
        let cut = rest.lastIndexOf('. ', TTS_MAX_CHARS)
        if (cut < TTS_MAX_CHARS * 0.5) cut = TTS_MAX_CHARS
        else cut += 1
        chunks.push(rest.slice(0, cut).trim())
        rest = rest.slice(cut).trim()
    }
    if (rest) chunks.push(rest)
    return chunks
}

// synthesizes speech for the given text via Groq's TTS endpoint sir — returns a base64 WAV
// string, or null if synthesis fails (a TTS failure should never fail the whole chat turn,
// the text reply already succeeded by the time this runs)
const synthesizeSpeech = async (text) => {
    try {
        const chunks = chunkForTts(text)
        const buffers = []
        for (const chunk of chunks) {
            const response = await groq.audio.speech.create({
                model: TTS_MODEL,
                voice: TTS_VOICE,
                input: chunk,
                response_format: 'wav',
            })
            buffers.push(Buffer.from(await response.arrayBuffer()))
        }
        return Buffer.concat(buffers).toString('base64')
    } catch (ttsErr) {
        console.log('TTS synthesis failed:', ttsErr.message)
        return null
    }
}

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

// shared prep for both streaming handlers sir — loads grounding, enforces the plan's
// per-chat message cap, and builds the Groq messages array. Returns { errorStatus, errorMessage }
// instead of throwing/responding directly, since the caller decides how to surface it
// (plain JSON before the stream starts, SSE event once it's already streaming)
const prepareChatCompletion = async (chat, plan, extraUserMessage) => {
    const grounding = await loadChatGrounding(chat)
    if (!grounding) {
        return {
            error: chat.notes?.length > 0
                ? 'The notes behind this chat no longer exist'
                : 'The note behind this chat no longer exists',
        }
    }

    if (extraUserMessage && plan && plan.maxMessagesPerChat !== null && chat.messages.length >= plan.maxMessagesPerChat) {
        return { error: 'This chat is full for your plan, please start a new chat or upgrade your plan' }
    }

    const contextWindow = plan?.contextWindow || CONTEXT_WINDOW
    const history = extraUserMessage ? chat.messages : chat.messages.slice(0, -1)
    const Messages = [
        {
            role: 'system',
            content: buildChatSystemPrompt(plan?.key, grounding)
        },
        ...history.slice(-contextWindow).map((m) => ({
            role: m.role,
            content: m.content
        })),
    ]
    if (extraUserMessage) {
        Messages.push({ role: 'user', content: extraUserMessage })
    }

    return { Messages }
}

// writes one SSE event sir — always {event}\ndata:{json}\n\n so the frontend parser has one shape to handle
const writeSseEvent = (res, event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// opens the SSE stream sir — split out so the voice-message handler can write its own
// `transcript` event before streamCompletion's token/done events start flowing, all on
// the same already-open connection
const openSseStream = (res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
}

// runs a Groq streaming completion and pipes tokens to the client as SSE sir, then
// persists the final chat exactly like the non-streaming handlers do. Shared by
// sendMessageStream and regenerateReplyStream — only how `chat.messages` gets updated
// before/after differs, passed in via `applyToChat`. `streamOpen` lets a caller that
// already opened the SSE stream itself (voice mode, to write a `transcript` event first)
// skip re-opening it here.
const streamCompletion = async ({ res, id, chat, plan, Messages, applyToChat, streamOpen = false, speak = false }) => {
    if (!streamOpen) openSseStream(res)

    const t0 = Date.now()
    let raw = ''
    try {
        const stream = await groq.chat.completions.create({
            messages: Messages,
            model: plan?.model || DEFAULT_MODEL,
            temperature: 0.5,
            stream: true,
        })

        for await (const chunk of stream) {
            const token = chunk.choices?.[0]?.delta?.content
            if (token) {
                raw += token
                writeSseEvent(res, 'token', { token })
            }
        }

        logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: plan?.model || DEFAULT_MODEL, latencyMs: Date.now() - t0, success: true })
    } catch (aiErr) {
        logAi({ user: id, type: 'chat', plan: plan?.key || 'Basic', model: plan?.model || DEFAULT_MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
        // friendly message for Groq free-tier limit errors sir, same mapping as the non-streaming handlers
        const message = (aiErr?.status === 413 || aiErr?.status === 429)
            ? 'Our AI service is at its per-minute limit right now — please wait about a minute and try again'
            : 'Something went wrong while talking to the AI'
        writeSseEvent(res, 'error', { message })
        return res.end()
    }

    if (raw.includes('</think>')) {
        raw = raw.split('</think>').pop()
    }
    raw = raw.trim()

    if (!raw) {
        writeSseEvent(res, 'error', { message: 'The AI returned an empty response, please try again' })
        return res.end()
    }

    applyToChat(raw)
    await chat.save()

    writeSseEvent(res, 'done', { reply: raw })

    if (speak) {
        const audio = await synthesizeSpeech(raw)
        if (audio) {
            writeSseEvent(res, 'audio', { audio, mimeType: 'audio/wav' })
        }
    }

    return res.end()
}

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

// POST /chat/:chatId/message/stream — same as sendMessage sir, but streams the reply
// token-by-token over SSE instead of waiting for the full completion
exports.sendMessageStream = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params
        const message = req.body.message

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({ success: false, message: 'Invalid chat id' })
        }
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' })
        }

        const chat = await Chat.findOne({ _id: chatId, user: id })
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' })
        }

        const plan = await getUserPlan(id)
        const trimmedMessage = message.trim()
        const { error, Messages } = await prepareChatCompletion(chat, plan, trimmedMessage)
        if (error) {
            return res.status(404).json({ success: false, message: error })
        }

        await streamCompletion({
            res,
            id,
            chat,
            plan,
            Messages,
            applyToChat: (raw) => {
                chat.messages.push({ role: 'user', content: trimmedMessage })
                chat.messages.push({ role: 'assistant', content: raw })
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Something went wrong while sending the message' })
        }
        res.end()
    }
}

// POST /chat/:chatId/message/voice — voice-mode Q&A sir. The client posts a recorded audio
// blob (no req.body.message — the transcript isn't known until Whisper decodes it), so this
// transcribes first, spends one `voiceChat` feature-usage unit, then runs the exact same
// completion + persistence path as sendMessageStream, finishing with a synthesized `audio`
// SSE event so the reply can be played back aloud. A TTS failure never fails the turn — by
// the time it runs the text reply has already succeeded and been saved.
exports.sendVoiceMessageStream = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params
        const audioFile = req.files?.audio

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({ success: false, message: 'Invalid chat id' })
        }
        if (!audioFile) {
            return res.status(400).json({ success: false, message: 'An audio recording is required' })
        }

        const chat = await Chat.findOne({ _id: chatId, user: id })
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' })
        }

        let transcript
        try {
            const extracted = await extractFromAudio(audioFile)
            transcript = extracted.text.trim()
        } catch (parseErr) {
            return res.status(400).json({ success: false, message: parseErr.message })
        }
        if (!transcript) {
            return res.status(400).json({ success: false, message: 'Could not transcribe any speech from that recording' })
        }

        const spend = await consumeFeatureUsage(id, 'voiceChat')
        if (!spend.ok) {
            return res.status(403).json({ success: false, message: spend.message })
        }

        const plan = await getUserPlan(id)
        const { error, Messages } = await prepareChatCompletion(chat, plan, transcript)
        if (error) {
            return res.status(404).json({ success: false, message: error })
        }

        openSseStream(res)
        writeSseEvent(res, 'transcript', { text: transcript })

        await streamCompletion({
            res,
            id,
            chat,
            plan,
            Messages,
            streamOpen: true,
            speak: true,
            applyToChat: (raw) => {
                chat.messages.push({ role: 'user', content: transcript })
                chat.messages.push({ role: 'assistant', content: raw })
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Something went wrong while sending the voice message' })
        }
        res.end()
    }
}

// POST /chat/:chatId/regenerate/stream — same as regenerateReply sir, streamed over SSE
exports.regenerateReplyStream = async (req, res) => {
    try {
        const id = req.User.id
        const { chatId } = req.params

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({ success: false, message: 'Invalid chat id' })
        }

        const chat = await Chat.findOne({ _id: chatId, user: id })
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' })
        }

        const last = chat.messages[chat.messages.length - 1]
        if (!last || last.role !== 'assistant') {
            return res.status(400).json({ success: false, message: 'There is no reply to regenerate yet' })
        }

        const plan = await getUserPlan(id)
        const { error, Messages } = await prepareChatCompletion(chat, plan, null)
        if (error) {
            return res.status(404).json({ success: false, message: error })
        }

        const historyWithoutLastReply = chat.messages.slice(0, -1)

        await streamCompletion({
            res,
            id,
            chat,
            plan,
            Messages,
            applyToChat: (raw) => {
                chat.messages = historyWithoutLastReply
                chat.messages.push({ role: 'assistant', content: raw })
            },
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Something went wrong while regenerating the reply' })
        }
        res.end()
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
