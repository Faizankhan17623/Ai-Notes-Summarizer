import { useMemo } from 'react'

// GitHub-style contribution calendar sir — one cell per day over the last ~12 months,
// shaded by activity count (notes created + flashcards reviewed + quizzes attempted, see
// Backend/controllers/Analytics.js getMyAnalytics). Pure CSS grid, no charting library —
// this is a fixed 7-row-by-N-column layout, not the kind of thing recharts is built for.
const WEEKS_TO_SHOW = 53
const DAY_MS = 24 * 60 * 60 * 1000

const intensityClass = (count) => {
    if (count === 0) return 'bg-surface-hover'
    if (count === 1) return 'bg-yellow-50/25'
    if (count <= 3) return 'bg-yellow-50/50'
    if (count <= 6) return 'bg-yellow-50/75'
    return 'bg-yellow-50'
}

const dayKey = (d) => d.toISOString().slice(0, 10)

const StudyHeatmap = ({ heatmap }) => {
    // builds a Sunday-start grid ending today sir, same convention GitHub's own calendar uses
    const { weeks, totalActive } = useMemo(() => {
        const countByDay = new Map((heatmap || []).map((d) => [d.date, d.count]))

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(today)
        endOfWeek.setDate(today.getDate() + (6 - today.getDay()))

        const totalDays = WEEKS_TO_SHOW * 7
        const start = new Date(endOfWeek.getTime() - (totalDays - 1) * DAY_MS)

        const cells = []
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(start.getTime() + i * DAY_MS)
            const key = dayKey(date)
            cells.push({ date: key, count: countByDay.get(key) || 0, future: date > today })
        }

        const cols = []
        for (let w = 0; w < WEEKS_TO_SHOW; w++) cols.push(cells.slice(w * 7, w * 7 + 7))

        const active = (heatmap || []).filter((d) => d.count > 0).length
        return { weeks: cols, totalActive: active }
    }, [heatmap])

    if (!heatmap || heatmap.length === 0) return null

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-6 mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-richblack-5 font-semibold">Study heatmap</h2>
                <p className="text-richblack-400 text-xs">{totalActive} active day{totalActive === 1 ? '' : 's'} in the last year</p>
            </div>

            <div className="overflow-x-auto">
                <div className="flex gap-[3px] w-max">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px]">
                            {week.map((day) => (
                                <div
                                    key={day.date}
                                    title={day.future ? '' : `${day.date}: ${day.count} activit${day.count === 1 ? 'y' : 'ies'}`}
                                    className={`w-2.5 h-2.5 rounded-sm ${day.future ? 'bg-transparent' : intensityClass(day.count)}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className="text-richblack-500 text-xs">Less</span>
                {[0, 1, 2, 4, 7].map((c) => (
                    <span key={c} className={`w-2.5 h-2.5 rounded-sm ${intensityClass(c)}`} />
                ))}
                <span className="text-richblack-500 text-xs">More</span>
            </div>
        </div>
    )
}

export default StudyHeatmap
