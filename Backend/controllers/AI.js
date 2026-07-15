const Groq = require('groq-sdk')

const Note = require('../Models/Note')
const User = require('../Models/User')
const { consumeCredit } = require('../utils/Plans')
const { buildSummarySystemPrompt } = require('../utils/Prompts')
const { logAi } = require('../utils/AdminLog')
const { extractText, extractFromUrl, extractFromAudio } = require('../utils/Parsers')
const { recordStudyActivity } = require('../utils/Streak')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODEL = 'qwen/qwen3-32b'

// shared by both the single-file/text path and the bulk-upload path below sir — runs the
// credit check + Groq call + Note.create for one already-extracted block of text, throws
// on any failure so each caller can decide how to report it (500 vs per-item bulk result)
const summarizeExtractedText = async (userId, text, sourceType) => {
    const spend = await consumeCredit(userId)
    if (!spend.ok) {
        const err = new Error(spend.message)
        err.status = 403
        throw err
    }

    const Messages = [
        { role: 'system', content: buildSummarySystemPrompt(spend.plan) },
        { role: 'user', content: `Summarize the following notes.\n\n=== NOTES ===\n${text}\n\nReturn only the JSON summary.` }
    ]

    const t0 = Date.now()
    let Invoking
    try {
        Invoking = await groq.chat.completions.create({
            messages: Messages,
            model: MODEL,
            temperature: 0,
            response_format: { type: 'json_object' },
        })
        logAi({ user: userId, type: 'summary', plan: spend.plan, model: MODEL, usage: Invoking.usage, latencyMs: Date.now() - t0, success: true })
    } catch (aiErr) {
        logAi({ user: userId, type: 'summary', plan: spend.plan, model: MODEL, latencyMs: Date.now() - t0, success: false, error: aiErr.message })
        throw aiErr
    }

    let raw = Invoking?.choices?.[0]?.message?.content
    if (!raw) {
        const err = new Error('The AI returned an empty response, please try again')
        err.status = 502
        throw err
    }

    if (raw.includes('</think>')) {
        raw = raw.split('</think>').pop()
    }
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    let summary
    try {
        summary = JSON.parse(raw)
    } catch (parseErr) {
        console.log('JSON parse failed:', parseErr.message)
        console.log('Raw model output:', raw)
        const err = new Error('The AI response was not in the expected format, please try again')
        err.status = 502
        throw err
    }

    if (!summary.title || !summary.tldr) {
        const err = new Error('The AI response was incomplete, please try again')
        err.status = 502
        throw err
    }

    const suggestedTags = Array.isArray(summary.suggestedTags)
        ? summary.suggestedTags.filter((t) => typeof t === 'string' && t.trim()).slice(0, 3)
        : []

    const note = await Note.create({
        user: userId,
        title: summary.title,
        sourceType,
        rawText: text,
        plan: spend.plan,
        summary,
        tags: suggestedTags,
    })

    return { note, summary }
}

// POST /summarize — takes a `notes` text field, one-or-more uploaded files, an article url,
// or an audio file. Multiple `notes` files -> bulk mode, returns { results: [...] } instead
// of a single { noteId, summary } sir
exports.Calling = async (req, res) => {
    try {
        const id = req.User.id

        const rawFiles = req.files?.notes
        if (Array.isArray(rawFiles) && rawFiles.length > 1) {
            return exports.bulkSummarize(req, res)
        }

        let text = ''
        let sourceType = 'text'

        const file = rawFiles
        const audioFile = req.files?.audio
        const pastedText = req.body?.notes
        const articleUrl = req.body?.url

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
        } else if (audioFile) {
            try {
                const extracted = await extractFromAudio(audioFile)
                text = extracted.text
                sourceType = extracted.sourceType
            } catch (parseErr) {
                return res.status(400).json({
                    success: false,
                    message: parseErr.message,
                })
            }
        } else if (articleUrl && articleUrl.trim()) {
            try {
                const extracted = await extractFromUrl(articleUrl.trim())
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
                message: 'Please paste some notes, upload a file, paste an article link, or dictate your notes first',
            })
        }

        if (text.trim().length < 20) {
            return res.status(400).json({
                success: false,
                message: 'These notes are too short to summarize meaningfully',
            })
        }

        const { note, summary } = await summarizeExtractedText(id, text, sourceType)

        const streakUser = await User.findById(id).select('currentStreak lastStreakDate longestStreak')
        await recordStudyActivity(streakUser)

        return res.status(200).json({
            success: true,
            noteId: note._id,
            summary
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : 'Something went wrong while summarizing your notes',
        })
    }
}

// invoked by Calling() above when multiple files are attached under `notes` sir — processes
// them sequentially (not parallel) so each one's credit check sees the previous one's spend,
// avoiding a race where N simultaneous requests all read the same starting credit count.
// Every file gets its own try/catch so one bad file (bad content, credits run out partway
// through) doesn't discard the notes that already succeeded — always 200, per-item ok/error
exports.bulkSummarize = async (req, res) => {
    try {
        const id = req.User.id
        const files = Array.isArray(req.files?.notes) ? req.files.notes : [req.files?.notes].filter(Boolean)

        if (!files.length) {
            return res.status(400).json({ success: false, message: 'Please choose at least one file to summarize' })
        }

        if (files.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'You can summarize up to 20 files at once, please split this into smaller batches',
            })
        }

        const results = []

        for (const file of files) {
            const fileName = file.name
            try {
                const extracted = await extractText(file)
                if (!extracted.text || extracted.text.trim().length < 20) {
                    results.push({ fileName, ok: false, message: 'This file has too little text to summarize meaningfully' })
                    continue
                }

                const { note, summary } = await summarizeExtractedText(id, extracted.text, extracted.sourceType)
                results.push({ fileName, ok: true, noteId: note._id, title: summary.title })
            } catch (fileErr) {
                console.log(`Bulk summarize failed for ${fileName}:`, fileErr.message)
                results.push({ fileName, ok: false, message: fileErr.message || 'Could not summarize this file' })
            }
        }

        const succeeded = results.some((r) => r.ok)
        if (succeeded) {
            const streakUser = await User.findById(id).select('currentStreak lastStreakDate longestStreak')
            await recordStudyActivity(streakUser)
        }

        return res.status(200).json({
            success: true,
            results,
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
