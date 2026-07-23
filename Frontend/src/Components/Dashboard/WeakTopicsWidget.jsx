import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaBrain } from 'react-icons/fa'
import { GetWeakTopics } from '../../Services/operations/StudyKit.js'

// mined from data already being recorded sir — flashcard ease factor (SM-2) and quiz
// right/wrong per question, grouped by the note tags backing them (see backend
// getWeakTopics). Quietly hides itself once there isn't enough review history yet, same as
// AnalyticsWidget hiding when there's no `data` — this is a bonus insight, not a page anchor.
const WeakTopicsWidget = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { weakTopics } = useSelector((state) => state.studyKit)

    useEffect(() => {
        dispatch(GetWeakTopics(token))
    }, [dispatch, token])

    if (!weakTopics?.length) return null

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-6 mb-10">
            <h2 className="text-richblack-5 font-semibold mb-1 flex items-center gap-2">
                <FaBrain className="text-yellow-50" size={14} /> Weak topics
            </h2>
            <p className="text-richblack-400 text-xs mb-4">Tags where your flashcard/quiz results suggest more practice would help.</p>

            <ul className="space-y-2.5">
                {weakTopics.map((t) => (
                    <li key={t.tag} className="flex items-center gap-3">
                        <span className="text-richblack-100 text-sm font-medium truncate shrink-0 w-28" title={t.tag}>
                            {t.tag}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
                            <div
                                className="h-full bg-danger-soft/70 rounded-full transition-all duration-500"
                                style={{ width: `${Math.round(t.difficulty * 100)}%` }}
                            />
                        </div>
                        <span className="text-richblack-500 text-xs font-mono w-9 text-right shrink-0">
                            {Math.round(t.difficulty * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default WeakTopicsWidget
