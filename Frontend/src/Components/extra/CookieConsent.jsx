import { useState } from 'react'
import { Link } from 'react-router-dom'

// Remembered in localStorage (not a cookie) sir — a consent flag stored client-side
// only needs to survive reloads, and localStorage never gets sent to the server
const CONSENT_KEY = 'cookieConsent'

const CookieConsent = () => {
    const [accepted, setAccepted] = useState(() => localStorage.getItem(CONSENT_KEY) === 'accepted')

    if (accepted) return null

    const accept = () => {
        localStorage.setItem(CONSENT_KEY, 'accepted')
        setAccepted(true)
    }

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-richblack-800 border-t border-richblack-700 px-4 py-3 sm:px-6">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                <p className="text-sm text-richblack-100 flex-1">
                    We use cookies to keep you signed in securely — nothing for ads or tracking.
                    See our{' '}
                    <Link to="/PrivacyPolicy" className="text-yellow-50 underline hover:text-yellow-100">
                        Privacy Policy
                    </Link>{' '}
                    for details.
                </p>
                <button
                    onClick={accept}
                    className="shrink-0 bg-yellow-50 text-richblack-900 text-sm font-semibold rounded-lg px-5 py-2 cursor-pointer hover:bg-yellow-100 transition-colors"
                >
                    Accept
                </button>
            </div>
        </div>
    )
}

export default CookieConsent
