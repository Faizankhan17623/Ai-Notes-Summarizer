import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaCalendarCheck, FaCheckCircle, FaRegCircle, FaClone, FaQuestionCircle, FaBookOpen, FaClock } from 'react-icons/fa'
import { GetTodayStudyPlan, GenerateStudyPlan, ToggleStudyPlanItem } from '../../Services/operations/StudyKit.js'
import IconBtn from '../extra/IconBtn.jsx'

const TYPE_ICON = {
    flashcards: FaClone,
    quiz: FaQuestionCircle,
    review_note: FaBookOpen,
    new_summary: FaBookOpen,
}

const TYPE_LINK = (item) => {
    if (!item.note) return null
    if (item.type === 'flashcards') return `/Dashboard/Note/${item.note}`
    if (item.type === 'quiz') return `/Dashboard/Note/${item.note}`
    return `/Dashboard/Note/${item.note}`
}

// AI-generated daily study plan sir — picks from the user's real due flashcards, unattempted
// quizzes, and weak topics (same signals StudyHeatmap/WeakTopicsWidget/BestTimeWidget already
// surface individually) and turns them into one ordered checklist for today
const StudyPlan = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { studyPlan, planLoading } = useSelector((state) => state.studyKit)

    useEffect(() => {
        dispatch(GetTodayStudyPlan(token))
    }, [dispatch, token])

    const items = studyPlan?.items || []
    const doneCount = items.filter((i) => i.done).length

    return (
        <>
            <Helmet><title>Study Plan — Notewise</title></Helmet>

            <div className="max-w-2xl mx-auto px-6 py-10">
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-richblack-5">Today's study plan</h1>
                        <p className="text-richblack-400 text-sm mt-1.5">
                            {items.length > 0
                                ? `${doneCount} of ${items.length} done — an AI-picked list of what's most worth studying today`
                                : 'A short, AI-picked list of what\'s most worth studying today'}
                        </p>
                    </div>
                    <IconBtn
                        text={studyPlan ? 'Regenerate' : 'Build my plan'}
                        outline={!!studyPlan}
                        disabled={planLoading}
                        onclick={() => dispatch(GenerateStudyPlan(token))}
                    />
                </div>

                {studyPlan?.suggestedHour !== null && studyPlan?.suggestedHour !== undefined && (
                    <div className="flex items-center gap-2 text-richblack-400 text-xs mb-6">
                        <FaClock className="text-yellow-50" size={12} />
                        You tend to study best around {studyPlan.suggestedHour % 12 || 12}{studyPlan.suggestedHour < 12 ? 'am' : 'pm'}
                    </div>
                )}

                {planLoading && !studyPlan ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                        <FaCalendarCheck className="text-yellow-50 text-3xl mx-auto mb-4" />
                        <p className="text-richblack-100 font-medium mb-1.5">No plan yet for today</p>
                        <p className="text-richblack-400 text-sm max-w-xs mx-auto">
                            Build one and the AI will pick your most useful flashcards, quizzes, and weak topics to cover.
                        </p>
                    </div>
                ) : (
                    <div className="border border-border-soft bg-surface rounded-lg p-6 md:p-8">
                        <ul className="space-y-3">
                            {items.map((item) => {
                                const Icon = TYPE_ICON[item.type] || FaBookOpen
                                const link = TYPE_LINK(item)
                                const content = (
                                    <div
                                        className={`flex items-start gap-3 p-3 rounded-md border border-border-soft transition-colors ${item.done ? 'bg-surface-hover/40' : 'hover:bg-surface-hover/60'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                dispatch(ToggleStudyPlanItem(studyPlan._id, item._id, token))
                                            }}
                                            className="mt-0.5 text-yellow-50 shrink-0 cursor-pointer"
                                            aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
                                        >
                                            {item.done ? <FaCheckCircle size={18} /> : <FaRegCircle size={18} className="text-richblack-400" />}
                                        </button>
                                        <Icon className="text-richblack-400 mt-1 shrink-0" size={13} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${item.done ? 'text-richblack-500 line-through' : 'text-richblack-5'}`}>
                                                {item.title}
                                            </p>
                                            {item.reason && (
                                                <p className="text-richblack-400 text-xs mt-0.5">{item.reason}</p>
                                            )}
                                        </div>
                                        <span className="text-richblack-500 text-xs font-mono shrink-0">~{item.estimatedMinutes}m</span>
                                    </div>
                                )
                                return (
                                    <li key={item._id}>
                                        {link ? <Link to={link}>{content}</Link> : content}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </>
    )
}

export default StudyPlan
