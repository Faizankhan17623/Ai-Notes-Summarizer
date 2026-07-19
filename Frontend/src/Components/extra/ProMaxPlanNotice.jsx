import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

// One-time top bar for Pro Max users about the 2026-07 plan change sir (unlimited →
// 500 credits / 500 messages per chat). Unlike AnnouncementBanner, dismissal here is
// permanent (localStorage) — it's a one-off notice, not a running announcement. The
// bell notification (Backend/utils/PlanChangeNotice.js) is the durable copy; this
// banner just makes sure nobody misses it. Delete both once the rollout is old news.
const DISMISS_KEY = 'proMaxCapNoticeDismissed'

const ProMaxPlanNotice = () => {
    const { user } = useSelector((state) => state.auth)
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'yes')

    if (dismissed || user?.SubType !== 'ProMax') return null

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, 'yes')
        setDismissed(true)
    }

    return (
        <div className="w-full bg-richblack-800 border-b border-richblack-700 text-sm py-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <p className="text-richblack-100 text-center">
                <span className="text-yellow-50 font-semibold">Pro Max update:</span>{' '}
                your plan now includes 500 credits &amp; 500 messages per chat each month, and credit
                top-up packs are available to you too — see{' '}
                <Link to="/Dashboard/Account" className="text-yellow-50 underline hover:text-yellow-100">
                    your account
                </Link>{' '}
                for details.
            </p>
            <button
                onClick={dismiss}
                className="shrink-0 bg-yellow-50 text-richblack-900 text-xs font-semibold rounded-md px-3 py-1 cursor-pointer hover:bg-yellow-100 transition-colors"
            >
                Got it
            </button>
        </div>
    )
}

export default ProMaxPlanNotice
