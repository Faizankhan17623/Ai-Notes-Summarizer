const { PDFParse } = require('pdf-parse')
const mammoth = require('mammoth')
const Groq = require('groq-sdk')
const { toFile } = require('groq-sdk')
const { validateUploadedFile, validateUploadedAudio } = require('./FileValidation')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// extracts plain text from an uploaded file sir — branches on the extension since
// express-fileupload gives us the original filename and a raw Buffer in `.data`
// returns { text, sourceType } or throws with a user-facing message
const extractText = async (file) => {
    // real content-based check first sir — magic bytes, not just the filename suffix,
    // see utils/FileValidation.js for why
    await validateUploadedFile(file)

    const name = (file.name || '').toLowerCase()

    if (name.endsWith('.pdf')) {
        const parser = new PDFParse({ data: file.data })
        const result = await parser.getText()
        if (!result?.text?.trim()) {
            throw new Error('Could not read any text from that PDF')
        }
        return { text: result.text, sourceType: 'pdf' }
    }

    if (name.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: file.data })
        if (!result?.value?.trim()) {
            throw new Error('Could not read any text from that Word document')
        }
        return { text: result.value, sourceType: 'docx' }
    }

    if (name.endsWith('.txt')) {
        const text = file.data.toString('utf-8')
        if (!text.trim()) {
            throw new Error('That text file appears to be empty')
        }
        return { text, sourceType: 'txt' }
    }

    throw new Error('Unsupported file type — please upload a PDF, DOCX, or TXT file')
}

// fetches an article's readable text via Tavily's Extract API sir — same { text, sourceType }
// contract as extractText (plus `images`), so AI.js can feed the result into the same
// summarize pipeline. include_images asks Tavily for the article's image URLs too — we
// don't run a vision model on them (current Groq catalog is text-only), we store them on
// the Note so the Report page can display them alongside the summary
const extractFromUrl = async (url) => {
    const response = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({ urls: [url], include_images: true }),
    })

    if (!response.ok) {
        throw new Error('Could not reach Tavily to fetch that article')
    }

    const data = await response.json()
    const result = data?.results?.[0]

    if (!result?.raw_content?.trim()) {
        throw new Error('Could not extract readable text from that link — it may be paywalled, blocked, or not an article')
    }

    // http(s) URLs only, capped at 8 sir — enough to illustrate the article without
    // turning the Report page into a gallery of tracking pixels and icons
    const images = (Array.isArray(result.images) ? result.images : [])
        .filter((img) => typeof img === 'string' && /^https?:\/\//i.test(img))
        .slice(0, 8)

    return { text: result.raw_content, sourceType: 'article', images }
}

// transcribes an uploaded audio file via Groq's Whisper endpoint sir — same { text, sourceType }
// contract as the other extractors, so AI.js can feed the transcript into the summarize pipeline
const extractFromAudio = async (file) => {
    const { ext } = await validateUploadedAudio(file)

    const transcription = await groq.audio.transcriptions.create({
        file: await toFile(file.data, `audio.${ext}`),
        model: 'whisper-large-v3-turbo',
        response_format: 'text',
    })

    const text = typeof transcription === 'string' ? transcription : transcription?.text
    if (!text?.trim()) {
        throw new Error('Could not transcribe any speech from that audio file')
    }

    return { text, sourceType: 'audio' }
}

module.exports = { extractText, extractFromUrl, extractFromAudio }
