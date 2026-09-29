const PDFDocument = require('pdfkit')
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx')

// PDF color palettes sir — matches the app's own light/dark surface+text tokens (see
// Frontend/src/index.css) so an exported PDF doesn't jar against whatever theme the user
// was just looking at. 'light' is PDFKit's own default (black on white), so only 'dark'
// needs an explicit full-page background fill before any text is drawn.
const PDF_THEMES = {
    light: { bg: '#ffffff', heading: '#000000', body: '#000000', muted: '#555555' },
    dark: { bg: '#0b0e17', heading: '#f2f1fb', body: '#dcdce6', muted: '#9a9bb0' },
}

// fills the CURRENT page's background sir, called once up front for page 1 and again on
// every subsequent 'pageAdded' event — PDFKit paints in call order, so the fill must happen
// before any text is drawn on that page, never after (a background fill drawn afterward
// would paint over the text instead of sitting behind it)
const fillPageBackground = (doc, palette) => {
    doc.save()
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(palette.bg)
    doc.restore()
}

const applyPdfTheme = (doc, theme) => {
    const palette = PDF_THEMES[theme] || PDF_THEMES.light
    if (theme === 'dark') {
        fillPageBackground(doc, palette)
        doc.on('pageAdded', () => fillPageBackground(doc, palette))
    }
    doc.fillColor(palette.heading)
    return palette
}

// shared plain-text section builder sir — used to derive both the PDF and Markdown bodies
// from the same summary object so all three formats always agree on content
const buildSections = (summary) => {
    const sections = []

    sections.push({ heading: null, lines: [summary.tldr] })

    if (summary.keyPoints?.length) {
        sections.push({ heading: 'Key Points', lines: summary.keyPoints.map((p) => `• ${p}`) })
    }

    if (summary.sections?.length) {
        summary.sections.forEach((s) => {
            sections.push({ heading: s.heading, lines: (s.points || []).map((p) => `• ${p}`) })
        })
    }

    if (summary.keyTerms?.length) {
        sections.push({
            heading: 'Key Terms',
            lines: summary.keyTerms.map((kt) => `• ${kt.term}: ${kt.meaning}`)
        })
    }

    // handles both the old flat array and the new {tasks,keyDates,decisions} shape sir
    if (summary.actionItems) {
        if (Array.isArray(summary.actionItems)) {
            if (summary.actionItems.length) {
                sections.push({ heading: 'Action Items', lines: summary.actionItems.map((a) => `• ${a}`) })
            }
        } else {
            const { tasks = [], keyDates = [], decisions = [] } = summary.actionItems
            if (tasks.length) sections.push({ heading: 'Tasks', lines: tasks.map((t) => `• ${t}`) })
            if (keyDates.length) sections.push({ heading: 'Key Dates', lines: keyDates.map((d) => `• ${d}`) })
            if (decisions.length) sections.push({ heading: 'Decisions', lines: decisions.map((d) => `• ${d}`) })
        }
    }

    return sections
}

// ---------- Markdown ----------

const toMarkdown = (note) => {
    const { summary } = note
    let md = `# ${summary.title}\n\n`
    md += `${summary.tldr}\n\n`

    buildSections(summary).slice(1).forEach((s) => {
        md += `## ${s.heading}\n\n`
        md += s.lines.join('\n') + '\n\n'
    })

    return md
}

// ---------- PDF ----------
// returns a Buffer sir — the controller streams it straight to the response

const toPdf = (note, theme = 'light') => {
    return new Promise((resolve, reject) => {
        const { summary } = note
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const palette = applyPdfTheme(doc, theme)

        doc.fontSize(20).fillColor(palette.heading).text(summary.title, { underline: true })
        doc.moveDown()
        doc.fontSize(11).fillColor(palette.body).text(summary.tldr)
        doc.moveDown()

        buildSections(summary).slice(1).forEach((s) => {
            doc.fontSize(14).fillColor(palette.heading).text(s.heading)
            doc.moveDown(0.3)
            doc.fontSize(11).fillColor(palette.body).text(s.lines.join('\n'))
            doc.moveDown()
        })

        doc.end()
    })
}

// ---------- DOCX ----------
// returns a Buffer sir

const toDocx = async (note) => {
    const { summary } = note
    const children = [
        new Paragraph({ text: summary.title, heading: HeadingLevel.TITLE }),
        new Paragraph({ text: summary.tldr }),
    ]

    buildSections(summary).slice(1).forEach((s) => {
        children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1 }))
        s.lines.forEach((line) => children.push(new Paragraph({ children: [new TextRun(line)] })))
    })

    const doc = new Document({ sections: [{ children }] })
    return Packer.toBuffer(doc)
}

// ---------- Review queue PDF ----------
// exports the full due-flashcard review queue as a printable study sheet sir — same
// PDFDocument/buffer pattern as toPdf, different content: a list of cards, not one note's summary

const toReviewQueuePdf = (flashcards, theme = 'light') => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const palette = applyPdfTheme(doc, theme)

        doc.fontSize(20).fillColor(palette.heading).text('Review Queue', { underline: true })
        doc.moveDown()
        doc.fontSize(11).fillColor(palette.muted).text(`${flashcards.length} card${flashcards.length === 1 ? '' : 's'} due — generated ${new Date().toLocaleDateString()}`)
        doc.moveDown(1.5)

        flashcards.forEach((card, i) => {
            doc.fillColor(palette.heading).fontSize(13).text(`${i + 1}. ${card.front}`)
            doc.fontSize(11).fillColor(palette.muted).text(`   ${card.back}`)
            doc.moveDown(0.8)
        })

        doc.end()
    })
}

// ---------- Flashcard deck PDF ----------
// exports every flashcard for ONE note as a printable deck sir — unlike toReviewQueuePdf
// (which is cross-note and due-date-only), this is the full deck for a single note regardless
// of due date, so a user can print/study a note's whole set offline

const toFlashcardDeckPdf = (note, flashcards, theme = 'light') => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const palette = applyPdfTheme(doc, theme)

        doc.fontSize(20).fillColor(palette.heading).text(note.summary?.title || note.title, { underline: true })
        doc.moveDown(0.3)
        doc.fontSize(11).fillColor(palette.muted).text(`${flashcards.length} card${flashcards.length === 1 ? '' : 's'} — generated ${new Date().toLocaleDateString()}`)
        doc.moveDown(1.5)

        flashcards.forEach((card, i) => {
            doc.fillColor(palette.heading).fontSize(13).text(`${i + 1}. ${card.front}`)
            doc.fontSize(11).fillColor(palette.muted).text(`   ${card.back}`)
            doc.moveDown(0.8)
        })

        doc.end()
    })
}

// ---------- Quiz PDF ----------
// exports one quiz as a printable answer sheet sir — questions + options first, then an
// answer key at the end so it can be studied "quiz yourself first" style

const toQuizPdf = (note, quiz, theme = 'light') => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const palette = applyPdfTheme(doc, theme)

        doc.fontSize(20).fillColor(palette.heading).text(note.summary?.title || note.title, { underline: true })
        doc.moveDown(0.3)
        doc.fontSize(11).fillColor(palette.muted).text(`${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'} — generated ${new Date().toLocaleDateString()}`)
        doc.moveDown(1.5)

        const letters = ['A', 'B', 'C', 'D', 'E', 'F']
        quiz.questions.forEach((q, i) => {
            doc.fillColor(palette.heading).fontSize(13).text(`${i + 1}. ${q.question}`)
            doc.moveDown(0.2)
            q.options.forEach((opt, j) => {
                doc.fontSize(11).fillColor(palette.body).text(`   ${letters[j] || j + 1}. ${opt}`)
            })
            doc.moveDown(0.8)
        })

        doc.addPage()
        doc.fontSize(16).fillColor(palette.heading).text('Answer Key', { underline: true })
        doc.moveDown()
        quiz.questions.forEach((q, i) => {
            const correctLetter = letters[q.correctIndex] || q.correctIndex + 1
            doc.fontSize(11).fillColor(palette.body).text(`${i + 1}. ${correctLetter}${q.explanation ? ` — ${q.explanation}` : ''}`)
            doc.moveDown(0.3)
        })

        doc.end()
    })
}

module.exports = { toMarkdown, toPdf, toDocx, toReviewQueuePdf, toFlashcardDeckPdf, toQuizPdf }
