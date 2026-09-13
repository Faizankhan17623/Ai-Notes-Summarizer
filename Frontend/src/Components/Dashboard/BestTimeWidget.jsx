import { useMemo } from 'react'
import { FaClock } from 'react-icons/fa'

// Mongo's $dayOfWeek is 1=Sunday..7=Saturday sir — matches Backend/controllers/Analytics.js's
// getMyAnalytics aggregation exactly
const DOW_LABELS = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const formatHour = (h) => {
    if (h === 0) return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
}

// activity VOLUME by hour/day-of-week sir, not accuracy — see the backend comment on why
// (Flashcard never stored per-review history, only a single lastReviewedAt). This answers
// "when do I actually show up to study," which is still a genuinely useful habit signal.
const BestTimeWidget = ({ bestTime }) => {
    const { topHour, topDow, hasData } = useMemo(() => {
        const byHour = bestTime?.byHour || []
        const byDow = bestTime?.byDayOfWeek || []
        if (byHour.length === 0 && byDow.length === 0) return { hasData: false }

        const topHour = byHour.reduce((best, row) => (!best || row.count > best.count ? row : best), null)
        const topDow = byDow.reduce((best, row) => (!best || row.count > best.count ? row : best), null)
        return { topHour, topDow, hasData: true }
    }, [bestTime])

    if (!hasData) return null

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-5 mb-10">
            <h2 className="text-richblack-5 font-semibold mb-1 flex items-center gap-2">
                <FaClock className="text-yellow-50" size={13} /> Your study habits
            </h2>
            <p className="text-richblack-400 text-xs mb-4">Based on when you've reviewed flashcards most often.</p>

            <div className="grid grid-cols-2 gap-3">
                {topHour && (
                    <div className="bg-surface-hover rounded-md p-3 text-center">
                        <p className="font-mono text-yellow-50 font-bold text-lg">{formatHour(topHour._id)}</p>
                        <p className="text-richblack-400 text-xs mt-0.5">Most active hour</p>
                    </div>
                )}
                {topDow && (
                    <div className="bg-surface-hover rounded-md p-3 text-center">
                        <p className="font-mono text-yellow-50 font-bold text-lg">{DOW_LABELS[topDow._id]}</p>
                        <p className="text-richblack-400 text-xs mt-0.5">Most active day</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BestTimeWidget
