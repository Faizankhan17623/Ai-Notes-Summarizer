// hand-written sample note for brand-new signups sir — shown instead of an empty History/
// Dashboard on first login, so the product looks alive immediately instead of a blank slate.
// No Groq call, no credit spent — this is a fixed, pre-written summary in the same Basic-tier
// shape utils/Prompts.js SUMMARY_SHAPES.Basic asks the AI for, so it renders on the Report
// page exactly like a real generated note would.
const SAMPLE_RAW_TEXT = `Welcome to Notewise! This is a sample note so you can see exactly what a summary looks like before you create your own.

Notewise turns your raw notes, PDFs, documents, and audio into clear, structured summaries. Paste your lecture notes, upload a PDF, or record a voice memo, and the AI pulls out the key points, action items, and suggested tags automatically.

To get started: click "New summary" in the sidebar, paste in some real notes (or upload a file), and see your first real summary in seconds. You can also try the "Chat" feature to ask questions about any note, or generate flashcards and a quiz to study from it.

This sample note counts toward nothing — it doesn't use any of your monthly credits.`

const sampleNoteFields = () => ({
    title: 'Welcome to Notewise — your first sample note',
    sourceType: 'text',
    rawText: SAMPLE_RAW_TEXT,
    plan: 'Basic',
    summary: {
        title: 'Welcome to Notewise — your first sample note',
        tldr: 'This sample note shows what a Notewise summary looks like — create your own by pasting notes or uploading a file from "New summary."',
        keyPoints: [
            'Notewise turns raw notes, PDFs, documents, and audio into structured summaries',
            'Paste text, upload a file, or record a voice memo to get started',
            'The AI extracts key points, action items, and suggested tags automatically',
            'Try the Chat feature to ask questions about any note',
            'Flashcards and quizzes can be generated from any note to help you study',
            'This sample note is free — it does not use any of your monthly credits',
        ],
        actionItems: {
            tasks: ['Click "New summary" in the sidebar and create your first real summary'],
            keyDates: [],
            decisions: [],
        },
        suggestedTags: ['Welcome', 'Getting Started'],
    },
    tags: ['Welcome', 'Getting Started'],
})

module.exports = { sampleNoteFields }
