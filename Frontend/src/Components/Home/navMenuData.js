// Each item links to its top-level page's matching section since standalone pages per
// item weren't built — /Features, /Solutions, /Resources cover all their items as sections.
export const NAV_MENUS = [
    {
        label: 'Features',
        items: [
            { title: 'AI Summarization', description: 'Turn long notes into structured, plan-aware summaries.', href: '/Features' },
            { title: 'Note-grounded Chat', description: 'Ask questions and get answers sourced from your notes.', href: '/Features/Chat' },
            { title: 'Flashcards & Quizzes', description: 'Auto-generate study material from any note.', href: '/Features/FlashcardsAndQuizzes' },
            { title: 'Spaced Repetition', description: 'Review flashcards on a schedule that adapts to you.', href: '/Features/SpacedRepetition' },
        ],
    },
    {
        label: 'Solutions',
        items: [
            { title: 'For Students', description: 'Summarize lectures and study smarter before exams.', href: '/Solutions' },
            { title: 'For Researchers', description: 'Distill papers and long-form reading in seconds.', href: '/Solutions' },
            { title: 'For Teams', description: 'Share notes and keep everyone on the same page.', href: '/Solutions' },
        ],
    },
    {
        label: 'Resources',
        items: [
            { title: 'Pricing', description: 'Compare plans and find the right fit.', href: '/Pricing' },
            { title: 'Help Center', description: 'Guides and answers to common questions.', href: '/HelpCenter' },
            { title: 'Blog', description: 'Tips on studying, note-taking, and using AI well.', href: '/Resources' },
        ],
    },
]
