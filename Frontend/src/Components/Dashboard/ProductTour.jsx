import { useState } from 'react'
import { Joyride, STATUS } from 'react-joyride'
import { useDispatch } from 'react-redux'
import { CompleteOnboarding } from '../../Services/operations/Auth.js'

// targets the data-tour attributes added to DashboardLayout.jsx's sidebar nav items sir —
// gated by the same hasCompletedOnboarding flag OnboardingChecklist.jsx already uses, so
// finishing/skipping either one marks onboarding done for both (no double-nagging)
const STEPS = [
    {
        target: '[data-tour="new-summary"]',
        content: 'Start here — paste text, upload a file, or drop a link to get an AI summary.',
        disableBeacon: true,
    },
    {
        target: '[data-tour="history"]',
        content: 'Every note you summarize lands here, with tags, folders, and search.',
    },
    {
        target: '[data-tour="chats"]',
        content: 'Ask follow-up questions about any note — the AI answers grounded in that note only.',
    },
    {
        target: '[data-tour="review"]',
        content: 'Turn a note into flashcards or a quiz, then review them on a spaced-repetition schedule.',
    },
    {
        target: '[data-tour="credits"]',
        content: "Keep an eye on your credits here — it'll warn you before you run out.",
    },
]

const ProductTour = ({ token }) => {
    const dispatch = useDispatch()
    const [run, setRun] = useState(true)

    const handleCallback = (data) => {
        if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
            setRun(false)
            dispatch(CompleteOnboarding(token))
        }
    }

    return (
        <Joyride
            steps={STEPS}
            run={run}
            continuous
            showSkipButton
            callback={handleCallback}
            styles={{
                options: {
                    arrowColor: 'var(--color-surface-raised)',
                    backgroundColor: 'var(--color-surface-raised)',
                    overlayColor: 'rgba(11, 14, 23, 0.6)',
                    primaryColor: '#ffd60a',
                    textColor: 'var(--color-richblack-5)',
                    zIndex: 10000,
                },
            }}
        />
    )
}

export default ProductTour
