import { useState } from 'react'
import { ACTIONS, Joyride, STATUS } from 'react-joyride'
import { useDispatch } from 'react-redux'
import { CompleteOnboarding } from '../../Services/operations/Auth.js'

// targets the data-tour attributes added to DashboardLayout.jsx's sidebar nav items sir —
// gated by the same hasCompletedOnboarding flag OnboardingChecklist.jsx already uses, so
// finishing/skipping either one marks onboarding done for both (no double-nagging).
// react-joyride 3.x renamed disableBeacon -> skipBeacon, AND renamed the `callback` prop
// itself to `onEvent` sir — `callback` doesn't exist anywhere in this version's source, so it
// was silently never invoked. That was the actual bug behind the tour reappearing after every
// dismissal: the handler below never ran, so CompleteOnboarding never fired and
// hasCompletedOnboarding stayed false in the DB no matter how the user closed the tour.
const STEPS = [
    {
        target: '[data-tour="new-summary"]',
        content: 'Start here — paste text, upload a file, or drop a link to get an AI summary.',
        skipBeacon: true,
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

    // completing (all steps clicked through), skipping, AND closing via the tooltip's own X
    // button (or clicking the dark overlay, same default action) all need to mark onboarding
    // done sir — otherwise the tour reopens next dashboard visit/refresh. STATUS alone only
    // catches Finish/Skip; a plain close fires action: 'close' without ever reaching
    // STATUS.SKIPPED/FINISHED, so both are checked here.
    const handleEvent = (data) => {
        if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED || data.action === ACTIONS.CLOSE) {
            setRun(false)
            dispatch(CompleteOnboarding(token))
        }
    }

    return (
        <Joyride
            steps={STEPS}
            run={run}
            continuous
            onEvent={handleEvent}
            options={{
                arrowColor: 'var(--color-surface-raised)',
                backgroundColor: 'var(--color-surface-raised)',
                buttons: ['skip', 'back', 'close', 'primary'],
                overlayColor: 'rgba(11, 14, 23, 0.6)',
                primaryColor: '#ffd60a',
                textColor: 'var(--color-richblack-5)',
                zIndex: 10000,
            }}
        />
    )
}

export default ProductTour
