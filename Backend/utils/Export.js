const PDFDocument = require('pdfkit')
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx')

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

const toPdf = (note) => {
    return new Promise((resolve, reject) => {
        const { summary } = note
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        doc.fontSize(20).text(summary.title, { underline: true })
        doc.moveDown()
        doc.fontSize(11).text(summary.tldr)
        doc.moveDown()

        buildSections(summary).slice(1).forEach((s) => {
            doc.fontSize(14).text(s.heading)
            doc.moveDown(0.3)
            doc.fontSize(11).text(s.lines.join('\n'))
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

const toReviewQueuePdf = (flashcards) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        doc.fontSize(20).text('Review Queue', { underline: true })
        doc.moveDown()
        doc.fontSize(11).fillColor('gray').text(`${flashcards.length} card${flashcards.length === 1 ? '' : 's'} due — generated ${new Date().toLocaleDateString()}`)
        doc.moveDown(1.5)

        flashcards.forEach((card, i) => {
            doc.fillColor('black').fontSize(13).text(`${i + 1}. ${card.front}`)
            doc.fontSize(11).fillColor('gray').text(`   ${card.back}`)
            doc.moveDown(0.8)
        })

        doc.end()
    })
}

// ---------- Flashcard deck PDF ----------
// exports every flashcard for ONE note as a printable deck sir — unlike toReviewQueuePdf
// (which is cross-note and due-date-only), this is the full deck for a single note regardless
// of due date, so a user can print/study a note's whole set offline

const toFlashcardDeckPdf = (note, flashcards) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        doc.fontSize(20).text(note.summary?.title || note.title, { underline: true })
        doc.moveDown(0.3)
        doc.fontSize(11).fillColor('gray').text(`${flashcards.length} card${flashcards.length === 1 ? '' : 's'} — generated ${new Date().toLocaleDateString()}`)
        doc.moveDown(1.5)

        flashcards.forEach((card, i) => {
            doc.fillColor('black').fontSize(13).text(`${i + 1}. ${card.front}`)
            doc.fontSize(11).fillColor('gray').text(`   ${card.back}`)
            doc.moveDown(0.8)
        })

        doc.end()
    })
}

// ---------- Quiz PDF ----------
// exports one quiz as a printable answer sheet sir — questions + options first, then an
// answer key at the end so it can be studied "quiz yourself first" style

const toQuizPdf = (note, quiz) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        doc.fontSize(20).text(note.summary?.title || note.title, { underline: true })
        doc.moveDown(0.3)
        doc.fontSize(11).fillColor('gray').text(`${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'} — generated ${new Date().toLocaleDateString()}`)
        doc.moveDown(1.5)

        const letters = ['A', 'B', 'C', 'D', 'E', 'F']
        quiz.questions.forEach((q, i) => {
            doc.fillColor('black').fontSize(13).text(`${i + 1}. ${q.question}`)
            doc.moveDown(0.2)
            q.options.forEach((opt, j) => {
                doc.fontSize(11).text(`   ${letters[j] || j + 1}. ${opt}`)
            })
            doc.moveDown(0.8)
        })

        doc.addPage()
        doc.fontSize(16).text('Answer Key', { underline: true })
        doc.moveDown()
        quiz.questions.forEach((q, i) => {
            const correctLetter = letters[q.correctIndex] || q.correctIndex + 1
            doc.fontSize(11).fillColor('black').text(`${i + 1}. ${correctLetter}${q.explanation ? ` — ${q.explanation}` : ''}`)
            doc.moveDown(0.3)
        })

        doc.end()
    })
}

module.exports = { toMarkdown, toPdf, toDocx, toReviewQueuePdf, toFlashcardDeckPdf, toQuizPdf }
