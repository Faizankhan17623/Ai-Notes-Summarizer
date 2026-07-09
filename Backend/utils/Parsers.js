const { PDFParse } = require('pdf-parse')
const mammoth = require('mammoth')

// extracts plain text from an uploaded file sir — branches on the extension since
// express-fileupload gives us the original filename and a raw Buffer in `.data`
// returns { text, sourceType } or throws with a user-facing message
const extractText = async (file) => {
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

module.exports = { extractText }
