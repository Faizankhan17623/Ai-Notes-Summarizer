import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import { FaClipboardList, FaTrash, FaClock, FaCalendarAlt } from 'react-icons/fa'
import { GetAllNotes } from '../../Services/operations/Notes.js'
import { GetExams, GenerateExam, DeleteExam, SaveExamSchedule, ToggleExamScheduleItem } from '../../Services/operations/StudyKit.js'
import { apiConnector } from '../../Services/apiConnector.js'
import { StudyKitData } from '../../Services/Apis/StudyKitApi.js'
import Loading from '../extra/Loading.jsx'

const TIME_OPTIONS = [
    { label: 'Untimed', value: '' },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '20 min', value: 1200 },
]

// practice exam mode sir — pick 1-10 notes, the AI draws a combined timed quiz across all of
// them in one generation. Separate from per-note Quiz (Report page): this is deliberately its
// own page since picking multiple notes doesn't fit inside a single note's Report layout.
const Exams = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token, user } = useSelector((state) => state.auth)
    const { allNotes } = useSelector((state) => state.notes)
    const { exams, loading } = useSelector((state) => state.studyKit)

    const [selectedIds, setSelectedIds] = useState(new Set())
    const [count, setCount] = useState(15)
    const [timeLimit, setTimeLimit] = useState('')
    const [calendarExam, setCalendarExam] = useState(null)
    const [examDate, setExamDate] = useState('')
    const [prepStartDate, setPrepStartDate] = useState(new Date().toISOString().slice(0, 10))
    const [dailyMinutes, setDailyMinutes] = useState(30)
    const [schedule, setSchedule] = useState([])
    const isPaidPlan = user?.SubType && user.SubType !== 'Basic'

    useEffect(() => {
        dispatch(GetAllNotes(token))
        dispatch(GetExams(token))
    }, [dispatch, token])

    const toggleNote = (noteId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(noteId)) next.delete(noteId)
            else if (next.size < 10) next.add(noteId)
            return next
        })
    }

    const handleGenerate = () => {
        if (selectedIds.size === 0) return
        dispatch(GenerateExam({
            noteIds: [...selectedIds],
            count,
            timeLimitSeconds: timeLimit ? Number(timeLimit) : undefined,
        }, token, navigate))
    }

    const handleDelete = async (e, examId) => {
        e.preventDefault()
        e.stopPropagation()
        const result = await Swal.fire({
            title: 'Delete this exam?',
            text: 'Its attempt history will be lost.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) dispatch(DeleteExam(examId, token))
    }

    const openCalendar = async (e, exam) => {
        e.preventDefault(); e.stopPropagation(); setCalendarExam(exam); setSchedule([])
        try { const r = await apiConnector('GET', `${StudyKitData.exam}/${exam._id}/schedule`, null, { Authorization: `Bearer ${token}` }); setSchedule(r.data.schedule || []); if (r.data.examDate) setExamDate(new Date(r.data.examDate).toISOString().slice(0, 10)); } catch { /* empty schedule */ }
    }

    const saveCalendar = async () => {
        if (!calendarExam || !examDate) return
        const result = await dispatch(SaveExamSchedule(calendarExam._id, { examDate, prepStartDate, dailyMinutes }, token))
        if (result) setSchedule(result.schedule || [])
    }

    return (
        <>
            <Helmet><title>Practice Exams | Dashboard</title></Helmet>
            <div className="max-w-5xl mx-auto px-4 py-8">
                <h1 className="text-xl font-bold text-richblack-5 mb-1">Practice exams</h1>
                <p className="text-richblack-400 text-sm mb-8">
                    Build a timed exam across several notes at once, then track your score over each retake.
                </p>

                {!isPaidPlan ? (
                    <div className="border border-border-soft bg-surface rounded-lg p-5 mb-8">
                        <p className="text-richblack-300 text-sm">
                            Practice exams are a Pro / Pro Max feature. <Link to="/Pricing" className="text-yellow-50 underline">Upgrade</Link> to build one.
                        </p>
                    </div>
                ) : (
                    <div className="border border-border-soft bg-surface rounded-lg p-5 mb-8">
                        <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold mb-3">
                            New exam — choose up to 10 notes
                        </p>

                        <div className="max-h-56 overflow-y-auto border border-border-soft rounded-md divide-y divide-border-soft mb-4">
                            {allNotes.length === 0 && (
                                <p className="text-richblack-500 text-sm p-3">No notes yet — summarize something first.</p>
                            )}
                            {allNotes.map((note) => (
                                <label key={note._id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-surface-hover">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(note._id)}
                                        onChange={() => toggleNote(note._id)}
                                        className="accent-yellow-50"
                                    />
                                    <span className="text-richblack-100 truncate">{note.title}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <label className="flex items-center gap-2 text-sm text-richblack-300">
                                Questions
                                <input
                                    type="number"
                                    min={4}
                                    max={40}
                                    value={count}
                                    onChange={(e) => setCount(Number(e.target.value))}
                                    className="w-16 bg-surface-raised border border-border-soft rounded-md px-2 py-1 text-richblack-100"
                                />
                            </label>
                            <label className="flex items-center gap-2 text-sm text-richblack-300">
                                <FaClock size={12} /> Time limit
                                <select
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(e.target.value)}
                                    className="bg-surface-raised border border-border-soft rounded-md px-2 py-1 text-richblack-100"
                                >
                                    {TIME_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                                </select>
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={selectedIds.size === 0 || loading}
                            className="bg-yellow-50 text-richblack-900 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer"
                        >
                            Generate exam ({selectedIds.size} note{selectedIds.size === 1 ? '' : 's'})
                        </button>
                    </div>
                )}

                <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold mb-3">Your exams</p>
                {calendarExam && <div className="border border-violet-400/40 bg-surface rounded-lg p-5 mb-5">
                    <div className="flex items-center justify-between mb-3"><p className="text-richblack-5 font-semibold">Preparation calendar · {calendarExam.title}</p><button type="button" onClick={() => setCalendarExam(null)} className="text-richblack-400">✕</button></div>
                    <div className="flex flex-wrap gap-3 items-end">
                        <label className="text-xs text-richblack-300">Exam date<input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="block mt-1 bg-surface-raised border border-border-soft rounded px-2 py-1 text-richblack-100" /></label>
                        <label className="text-xs text-richblack-300">Start date<input type="date" value={prepStartDate} onChange={e => setPrepStartDate(e.target.value)} className="block mt-1 bg-surface-raised border border-border-soft rounded px-2 py-1 text-richblack-100" /></label>
                        <label className="text-xs text-richblack-300">Minutes/day<input type="number" min="10" max="240" value={dailyMinutes} onChange={e => setDailyMinutes(Number(e.target.value))} className="block mt-1 w-24 bg-surface-raised border border-border-soft rounded px-2 py-1 text-richblack-100" /></label>
                        <button type="button" onClick={saveCalendar} className="bg-yellow-50 text-richblack-900 rounded px-3 py-2 text-sm font-semibold">Save calendar</button>
                    </div>
                    {schedule.length > 0 && <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{schedule.slice(0, 30).map(day => <button type="button" key={day.date} onClick={async () => { const item = await dispatch(ToggleExamScheduleItem(calendarExam._id, day.date, token)); if (item) setSchedule(current => current.map(d => d.date === day.date ? { ...d, done: item.done } : d)) }} className={`text-left border rounded p-2 text-xs cursor-pointer ${day.done ? 'border-good/50 bg-good/10' : 'border-border-soft'}`}><span className="text-yellow-50 font-semibold">{day.date} {day.done ? '✓' : ''}</span><p className="text-richblack-300 mt-1">{day.task} · {day.minutes} min</p></button>)}</div>}
                </div>}
                {loading && exams.length === 0 ? <Loading text="Loading exams..." /> : (
                    <div className="space-y-2">
                        {exams.length === 0 && <p className="text-richblack-500 text-sm">No exams yet.</p>}
                        {exams.map((exam) => {
                            const last = exam.attempts?.[exam.attempts.length - 1]
                            return (
                                <Link
                                    key={exam._id}
                                    to={`/Dashboard/Exam/${exam._id}`}
                                    className="flex items-center justify-between gap-3 border border-border-soft bg-surface rounded-lg px-4 py-3 hover:bg-surface-hover transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FaClipboardList className="text-richblack-500 group-hover:text-yellow-50 shrink-0 transition-colors" size={14} />
                                        <div className="min-w-0">
                                            <p className="text-richblack-100 text-sm truncate">{exam.title}</p>
                                            <p className="text-richblack-500 text-xs mt-0.5">
                                                {exam.notes?.length || 0} note{exam.notes?.length === 1 ? '' : 's'}
                                                {last ? ` · last score ${last.score}/${last.total}` : ' · not attempted yet'}
                                                {exam.attempts?.length > 1 ? ` · ${exam.attempts.length} attempts` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(e, exam._id)}
                                        className="text-richblack-600 hover:text-pink-200 transition-colors shrink-0"
                                        title="Delete exam"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                    <button type="button" onClick={(e) => openCalendar(e, exam)} className="text-richblack-500 hover:text-yellow-50 shrink-0" title="Plan preparation"><FaCalendarAlt size={12} /></button>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}

export default Exams
