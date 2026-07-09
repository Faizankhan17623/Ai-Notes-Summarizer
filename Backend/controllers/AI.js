const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const { consumeCredit } = require('../utils/Plans')
const { buildSummarySystemPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { extractText } = require('../utils/Parsers')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODEL = 'qwen/qwen3-32b'

// POST /summarize — takes either a `notes` text field OR an uploaded file, returns + saves a structured summary sir
exports.Calling = async (req, res) => {
    try {
        const id = req.User.id

        let text = ''
        let sourceType = 'text'

        const file = req.files?.notes
        const pastedText = req.body?.notes

        if (file) {
            try {
                const extracted = await extractText(file)
                text = extracted.text
                sourceType = extracted.sourceType
            } catch (parseErr) {
                return res.status(400).json({
                    success: false,
                    message: parseErr.message,
                })
            }
        } else if (pastedText && pastedText.trim()) {
            text = pastedText.trim()
            // the frontend tells us if this text came from the mic sir, otherwise it's typed/pasted
            sourceType = req.body?.sourceType === 'voice' ? 'voice' : 'text'
        }

        // not case sir — nothing usable was sent
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please paste some notes, upload a file, or dictate your notes first',
            })
        }

        if (text.trim().length < 20) {
            return res.status(400).json({
                success: false,
                message: 'These notes are too short to summarize meaningfully',
            })
        }

        // plan-aware credit check sir — Basic gets 5/mo, Pro gets 100, ProMax unlimited
        const spend = await consumeCredit(id)

        if (!spend.ok) {
            return res.status(403).json({
                success: false,
                message: spend.message
            })
        }

        // plan-aware system prompt sir — Basic gets the core summary, Pro adds sections/key-terms, ProMax gets quiz+flashcards too
        const Messages = [
            {
                role: 'system',
                content: buildSummarySystemPrompt(spend.plan)
            },
            {
                role: 'user',
                content: `Summarize the following notes.\n\n=== NOTES ===\n${text}\n\nReturn only the JSON summary.`
            }
        ]

        // timed + logged sir — every call lands in AiLog for the admin cost monitor
        const t0 = Date.now()
        let Invoking
        try {
            Invoking = await groq.chat.completions.create({
                messages: Messages,
                model: MODEL,
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            logAi({ user: id, type: 'summary', plan: spend.plan, model: MODEL, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
        } catch (aiErr) {
            logAi({ user: id, type: 'summary', plan: spend.plan, model: MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
            throw aiErr
        }

        let raw = Invoking?.choices?.[0]?.message?.content
        if (!raw) {
            return res.status(502).json({
                success: false,
                message: 'The AI returned an empty response, please try again',
            })
        }

        // strip the model's <think> reasoning block (qwen) sir
        if (raw.includes('</think>')) {
            raw = raw.split('</think>').pop()
        }
        // strip stray ```json fences in case the model wraps it sir
        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

        let summary
        try {
            summary = JSON.parse(raw)
        } catch (parseErr) {
            console.log('JSON parse failed:', parseErr.message)
            console.log('Raw model output:', raw)
            return res.status(502).json({
                success: false,
                message: 'The AI response was not in the expected format, please try again',
            })
        }

        if (!summary.title || !summary.tldr) {
            return res.status(502).json({
                success: false,
                message: 'The AI response was incomplete, please try again',
            })
        }

        const note = await Note.create({
            user: id,
            title: summary.title,
            sourceType,
            rawText: text,
            plan: spend.plan,
            summary,
        })

        return res.status(200).json({
            success: true,
            noteId: note._id,
            summary
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while summarizing your notes',
        })
    }
}
