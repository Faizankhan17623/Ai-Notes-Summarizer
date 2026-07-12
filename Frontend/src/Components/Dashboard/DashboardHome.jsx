import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaPlus, FaFilePdf, FaFileWord, FaFileAlt, FaMicrophone, FaThumbtack, FaInbox } from 'react-icons/fa'
import { GetAllNotes } from '../../Services/operations/Notes.js'
import { GetProfile } from '../../Services/operations/Auth.js'
import AnalyticsWidget from './AnalyticsWidget.jsx'

// small icon chip by sourceType sir — same idea as the mockup's ftype chip, using the
// one icon set already used everywhere else (react-icons/fa)
const sourceIcons = {
    pdf: FaFilePdf,
    docx: FaFileWord,
    txt: FaFileAlt,
    voice: FaMicrophone,
    text: FaFileAlt,
}

const DashboardHome = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { allNotes } = useSelector((state) => state.notes)
    const { plan, activity } = useSelector((state) => state.profile)

    useEffect(() => {
        dispatch(GetAllNotes(token))
        dispatch(GetProfile(token))
    }, [dispatch, token])

    const recent = allNotes.slice(0, 5)

    // this-week count sir — derived from whatever GetAllNotes already returned client-side,
    // no new API call for this redesign pass
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const notesThisWeek = allNotes.filter((n) => new Date(n.createdAt).getTime() >= weekAgo).length

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Dashboard — AI Notes Summarizer</title></Helmet>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-1">Welcome back, {user?.firstName}</h1>
                    <p className="text-richblack-300 text-sm">You've summarized {allNotes.length} note{allNotes.length === 1 ? '' : 's'} in total</p>
                </div>
                <Link
                    to="/Dashboard/New-Summary"
                    className="flex items-center gap-2 bg-yellow-50 text-richblack-900 font-semibold text-sm rounded-md px-4 py-2.5 hover:scale-95 transition-all shrink-0"
                >
                    <FaPlus /> New summary
                </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="border border-border-soft rounded-lg p-5 bg-surface hover:border-yellow-50/40 transition-colors">
                    <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">Notes this week</p>
                    <p className="font-mono text-2xl text-richblack-5">{notesThisWeek}</p>
                </div>
                <div className="border border-border-soft rounded-lg p-5 bg-surface hover:border-yellow-50/40 transition-colors">
                    <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">Total notes</p>
                    <p className="font-mono text-2xl text-richblack-5">{allNotes.length}</p>
                </div>
                {plan && (
                    <div className="border border-border-soft rounded-lg p-5 bg-surface hover:border-yellow-50/40 transition-colors">
                        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">Credits left</p>
                        <p className="font-mono text-2xl text-richblack-5">
                            {plan.creditsLimit === null ? '∞' : `${Math.max(plan.creditsLimit - plan.creditsUsed, 0)}`}
                            {plan.creditsLimit !== null && <span className="text-sm text-richblack-400 font-sans">/{plan.creditsLimit}</span>}
                        </p>
                    </div>
                )}
                {activity && activity.currentStreak > 0 && (
                    <div className="border border-yellow-50/40 rounded-lg p-5 bg-yellow-50/5 hover:border-yellow-50/60 transition-colors">
                        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">Study streak</p>
                        <p className="font-mono text-2xl text-richblack-5">
                            {activity.currentStreak} <span className="text-sm text-richblack-400 font-sans">day{activity.currentStreak === 1 ? '' : 's'}</span>
                        </p>
                        {activity.longestStreak > activity.currentStreak && (
                            <p className="text-richblack-400 text-xs mt-1">Best: {activity.longestStreak} days</p>
                        )}
                    </div>
                )}
            </div>

            {activity && activity.dailyGoal > 0 && (
                <div className="border border-border-soft rounded-lg p-5 bg-surface mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs uppercase tracking-wide text-richblack-400">Today's study goal</p>
                        <p className="font-mono text-sm text-richblack-5">
                            {activity.studyActionsToday} / {activity.dailyGoal}
                        </p>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                        <div
                            className="h-full bg-yellow-50 transition-all"
                            style={{ width: `${Math.min((activity.studyActionsToday / activity.dailyGoal) * 100, 100)}%` }}
                        />
                    </div>
                    {activity.studyActionsToday >= activity.dailyGoal && (
                        <p className="text-yellow-50 text-xs mt-2">Goal reached for today</p>
                    )}
                </div>
            )}

            <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
                <div className="border border-border-soft rounded-lg bg-surface overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
                        <h2 className="text-richblack-5 font-semibold text-sm">Recent notes</h2>
                        <Link to="/Dashboard/History" className="text-richblack-400 hover:text-yellow-50 text-xs transition-colors">View all →</Link>
                    </div>
                    {recent.length === 0 ? (
                        <div className="text-center py-16 px-8">
                            <FaInbox className="text-richblack-500 text-3xl mx-auto mb-3" />
                            <p className="text-richblack-5 font-semibold mb-1">No notes yet</p>
                            <p className="text-richblack-400 text-sm">Create your first summary to see it here.</p>
                        </div>
                    ) : (
                        <div>
                            {recent.map((note) => {
                                const Icon = sourceIcons[note.sourceType] || FaFileAlt
                                return (
                                    <Link
                                        key={note._id}
                                        to={`/Dashboard/Note/${note._id}`}
                                        className="flex items-center gap-3 px-5 py-3 border-b border-border-soft last:border-b-0 hover:bg-surface-hover transition-colors"
                                    >
                                        <span className="w-8 h-8 rounded-md bg-yellow-50/10 text-yellow-50 flex items-center justify-center shrink-0 text-sm">
                                            <Icon />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-richblack-5 text-sm font-medium truncate">{note.title}</span>
                                            <span className="block text-richblack-400 text-xs mt-0.5">{new Date(note.createdAt).toLocaleDateString()} · {note.sourceType}</span>
                                        </span>
                                        {note.pinned && <FaThumbtack className="text-yellow-50 text-xs shrink-0" />}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                <AnalyticsWidget />
            </div>
        </div>
    )
}

export default DashboardHome
