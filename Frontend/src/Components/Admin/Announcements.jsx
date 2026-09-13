import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaBullhorn, FaClock, FaCalendarCheck, FaHourglassHalf, FaCircle, FaPen, FaEyeSlash, FaTrash, FaTimes } from 'react-icons/fa'
import { GetAnnouncements, CreateAnnouncement, EditAnnouncement, DeactivateAnnouncement, DeleteAnnouncement } from '../../Services/operations/Admin.js'
import IconBtn from '../extra/IconBtn.jsx'
import { fadeUp, staggerContainer } from '../extra/motionVariants.js'

// mirrors MAX_ACTIVE_ANNOUNCEMENTS in Backend/controllers/Admin.js sir — kept in sync there,
// not derived from the response, so the Publish form can disable itself before the admin
// even submits rather than only finding out from the 400
const MAX_ACTIVE_ANNOUNCEMENTS = 3
// mirrors MIN_START_DELAY_MS/MAX_WINDOW_DAYS there too sir — used to pre-fill/clamp the
// datetime-local inputs so the admin sees a form that's already valid rather than only
// finding out about the tomorrow-or-later / 15-day-max rules from a 400 after submitting
const MAX_WINDOW_DAYS = 15
const DAY_MS = 24 * 60 * 60 * 1000

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in LOCAL time sir, no timezone
// suffix — toISOString() is UTC, so it has to be built from the local getters, not sliced off
// an ISO string (a common source of the off-by-a-few-hours bug this app has hit before)
const toDatetimeLocalValue = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// a timed announcement's real-world state sir — three-way, not just active/inactive:
// scheduled (startAt hasn't arrived yet), live (inside its window), expired (endAt passed).
// Comparing against `new Date()` directly rather than any string parsing/formatting — dates
// here are always real Date objects end to end, never strings, per the model's comment
const timedStatus = (a) => {
    if (!a.startAt) return null
    const now = new Date()
    const start = new Date(a.startAt)
    const end = new Date(a.endAt)
    if (now < start) return 'scheduled'
    if (now > end) return 'expired'
    return 'live'
}

// the visible "lane" a card sorts into sir — inactive (manually deactivated) always wins
// regardless of timing, since that's a deliberate admin action overriding whatever the
// window says
const lane = (a) => (!a.active ? 'inactive' : timedStatus(a) || 'live')

const LANES = [
    { key: 'live', label: 'Live now', icon: FaCircle, dot: 'text-good', tone: 'border-good/40 bg-good/5' },
    { key: 'scheduled', label: 'Scheduled', icon: FaHourglassHalf, dot: 'text-warn', tone: 'border-warn/40 bg-warn/5' },
    { key: 'expired', label: 'Expired', icon: FaCalendarCheck, dot: 'text-richblack-500', tone: 'border-border-soft bg-surface' },
    { key: 'inactive', label: 'Deactivated', icon: FaEyeSlash, dot: 'text-richblack-500', tone: 'border-border-soft bg-surface' },
]

// countdown-flavored relative label sir — "starts in 3h", "ends in 2d", purely a nicer
// glance-value on top of the exact start/end timestamps already shown below it, computed
// via plain millisecond Date math like everywhere else in this feature, never string math
const relativeLabel = (target) => {
    const diffMs = new Date(target).getTime() - Date.now()
    const abs = Math.abs(diffMs)
    const prefix = diffMs >= 0 ? 'in' : 'ago'
    if (abs < 60 * 60 * 1000) return `${Math.max(1, Math.round(abs / 60000))}m ${prefix}`
    if (abs < DAY_MS) return `${Math.round(abs / (60 * 60 * 1000))}h ${prefix}`
    return `${Math.round(abs / DAY_MS)}d ${prefix}`
}

const Announcements = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { announcements, loading } = useSelector((state) => state.admin)
    const [message, setMessage] = useState('')
    const [timed, setTimed] = useState(false)
    const [startAt, setStartAt] = useState('')
    const [endAt, setEndAt] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    useEffect(() => {
        dispatch(GetAnnouncements(token))
    }, [dispatch, token])

    // earliest allowed start (tomorrow, same clock time) and the latest end that stays within
    // MAX_WINDOW_DAYS of whatever start is currently picked sir — recomputed on render rather
    // than memoized, since "now" and "the currently typed startAt" both need to stay fresh
    const earliestStart = new Date(Date.now() + DAY_MS)
    const latestEndForStart = startAt ? new Date(new Date(startAt).getTime() + MAX_WINDOW_DAYS * DAY_MS) : null

    // pre-fills to the earliest valid start/end the moment "Timed" is checked sir — so the
    // admin sees an already-valid window by default instead of two empty pickers
    const handleToggleTimed = (checked) => {
        setTimed(checked)
        if (checked && !startAt) {
            setStartAt(toDatetimeLocalValue(earliestStart))
            setEndAt(toDatetimeLocalValue(new Date(earliestStart.getTime() + DAY_MS)))
        }
    }

    // a slot is held by anything active AND not yet expired sir — an untimed one (no
    // startAt) always holds its slot while active; a timed one stops holding it once
    // its own endAt has passed, same "did this already finish" logic as the backend's
    // activeCount check in createAnnouncement
    const activeCount = useMemo(
        () => announcements.filter((a) => a.active && timedStatus(a) !== 'expired').length,
        [announcements]
    )
    const atLimit = activeCount >= MAX_ACTIVE_ANNOUNCEMENTS
    const timedFieldsValid = !timed || (startAt && endAt)

    const grouped = useMemo(() => {
        const byLane = { live: [], scheduled: [], expired: [], inactive: [] }
        announcements.forEach((a) => byLane[lane(a)].push(a))
        return byLane
    }, [announcements])

    const handlePublish = (e) => {
        e.preventDefault()
        if (!message.trim() || atLimit || !timedFieldsValid) return
        dispatch(CreateAnnouncement(message.trim(), timed, timed ? startAt : null, timed ? endAt : null, token))
        setMessage('')
        setTimed(false)
        setStartAt('')
        setEndAt('')
    }

    const startEdit = (a) => {
        setEditingId(a._id)
        setEditText(a.message)
    }

    const handleSaveEdit = async (e, id) => {
        e.preventDefault()
        if (!editText.trim()) return
        const ok = await dispatch(EditAnnouncement(id, editText.trim(), token))
        if (ok) setEditingId(null)
    }

    return (
        <div className="max-w-3xl px-6 md:px-10 py-10">
            <Helmet><title>Admin Announcements — Notewise</title></Helmet>

            <motion.div initial="hidden" animate="show" variants={fadeUp} className="flex items-center gap-3 mb-8">
                <span className="w-11 h-11 rounded-xl bg-yellow-50/10 text-yellow-50 flex items-center justify-center shrink-0">
                    <FaBullhorn size={18} />
                </span>
                <div>
                    <h1 className="font-display text-3xl font-semibold text-richblack-5">Announcements</h1>
                    <p className="text-richblack-400 text-sm">Site-wide banner messages — up to {MAX_ACTIVE_ANNOUNCEMENTS} live at once.</p>
                </div>
            </motion.div>

            {/* slot tracker sir — 3 pips, filled = occupied, mirrors activeCount at a glance
                instead of just the "X / 3" text alone */}
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="flex items-center gap-1.5 mb-6">
                {Array.from({ length: MAX_ACTIVE_ANNOUNCEMENTS }).map((_, i) => (
                    <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < activeCount ? 'bg-yellow-50' : 'bg-border-soft'}`}
                    />
                ))}
                <span className="text-richblack-500 text-xs font-mono shrink-0 ml-1">{activeCount}/{MAX_ACTIVE_ANNOUNCEMENTS}</span>
            </motion.div>

            <motion.form
                onSubmit={handlePublish}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="relative overflow-hidden border border-border-soft bg-surface rounded-xl p-5 mb-10"
            >
                <span aria-hidden className="absolute -top-16 -right-16 w-40 h-40 bg-yellow-50/10 blur-3xl rounded-full pointer-events-none" />
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={atLimit ? `Limit of ${MAX_ACTIVE_ANNOUNCEMENTS} active reached — deactivate one first` : "What should everyone see..."}
                    disabled={atLimit}
                    rows={2}
                    maxLength={300}
                    className="relative w-full bg-transparent text-richblack-5 text-base placeholder:text-richblack-500 outline-none resize-none disabled:opacity-50"
                />
                <div className="relative flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-border-soft">
                    <label className={`flex items-center gap-2 text-xs select-none ${atLimit ? 'text-richblack-600 cursor-not-allowed' : 'text-richblack-300 cursor-pointer'}`}>
                        {/* a <button> nested inside a <label> isn't a standard pairing sir — the browser's
                            own label-click-forwarding behavior and the button's onClick could fight each
                            other, which is exactly the kind of "sometimes doesn't respond" flakiness this
                            was hit by. Real <input type="checkbox"> here instead (visually hidden via
                            sr-only, so the styled span next to it is 100% of what's seen) is the standard,
                            reliable pattern — the label's native click-forwarding IS the toggle mechanism,
                            no manual onClick/role="switch" needed at all */}
                        <input
                            type="checkbox"
                            checked={timed}
                            onChange={(e) => handleToggleTimed(e.target.checked)}
                            disabled={atLimit}
                            className="sr-only peer"
                        />
                        <span
                            className={`relative w-9 h-5 rounded-full border transition-colors duration-200 shrink-0 peer-disabled:cursor-not-allowed ${timed ? 'bg-yellow-50 border-yellow-50' : 'bg-surface-hover border-border-soft'}`}
                        >
                            {/* white + shadow sir, not a theme token — needs to read as a knob against
                                BOTH a light track and the yellow "on" fill in both themes; a dark theme
                                token disappeared into the gold track / light page background depending
                                on theme, per the screenshot sir flagged earlier */}
                            <motion.span
                                animate={{ x: timed ? 18 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                            />
                        </span>
                        <FaClock size={11} className={timed ? 'text-yellow-50' : ''} />
                        Timed window (max {MAX_WINDOW_DAYS} days, starts tomorrow or later)
                    </label>
                    <IconBtn text="Publish" type="submit" disabled={!message.trim() || atLimit || !timedFieldsValid} />
                </div>

                <AnimatePresence>
                    {timed && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="relative overflow-hidden"
                        >
                            <div className="flex flex-wrap items-center gap-3 pt-3">
                                <label className="flex items-center gap-1.5 text-richblack-400 text-xs">
                                    Start
                                    <input
                                        type="datetime-local"
                                        value={startAt}
                                        min={toDatetimeLocalValue(earliestStart)}
                                        onChange={(e) => setStartAt(e.target.value)}
                                        className="bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-2 py-1 text-xs outline-none focus:border-yellow-50 transition-colors"
                                    />
                                </label>
                                <label className="flex items-center gap-1.5 text-richblack-400 text-xs">
                                    End
                                    <input
                                        type="datetime-local"
                                        value={endAt}
                                        min={startAt || toDatetimeLocalValue(earliestStart)}
                                        max={latestEndForStart ? toDatetimeLocalValue(latestEndForStart) : undefined}
                                        onChange={(e) => setEndAt(e.target.value)}
                                        className="bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-2 py-1 text-xs outline-none focus:border-yellow-50 transition-colors"
                                    />
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.form>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : announcements.length === 0 ? (
                <div className="border border-dashed border-border-soft rounded-xl text-center py-16 px-8">
                    <FaBullhorn className="text-richblack-600 text-2xl mx-auto mb-3" />
                    <p className="text-richblack-400 text-sm">No announcements yet — publish one above.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {LANES.map(({ key, label, icon: LaneIcon, dot, tone }) => {
                        const items = grouped[key]
                        if (items.length === 0) return null
                        return (
                            <div key={key}>
                                <div className="flex items-center gap-2 mb-3">
                                    <LaneIcon size={key === 'live' ? 8 : 11} className={dot} />
                                    <h2 className="text-richblack-300 text-xs font-semibold uppercase tracking-wide">{label}</h2>
                                    <span className="text-richblack-600 text-xs font-mono">{items.length}</span>
                                </div>
                                <motion.div
                                    initial="hidden"
                                    animate="show"
                                    variants={staggerContainer(0.06)}
                                    className="space-y-2.5"
                                >
                                    {items.map((a) => (
                                        <motion.div
                                            key={a._id}
                                            variants={fadeUp}
                                            layout
                                            className={`border rounded-lg p-4 transition-colors duration-200 ${tone}`}
                                        >
                                            {editingId === a._id ? (
                                                <form onSubmit={(e) => handleSaveEdit(e, a._id)} className="flex gap-2">
                                                    <input
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        autoFocus
                                                        className="flex-1 bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-1.5 text-sm outline-none focus:border-yellow-50 transition-colors"
                                                    />
                                                    <button type="submit" disabled={!editText.trim()} className="text-yellow-50 text-xs font-medium cursor-pointer hover:underline disabled:opacity-50 shrink-0">
                                                        Save
                                                    </button>
                                                    <button type="button" onClick={() => setEditingId(null)} className="text-richblack-300 text-xs cursor-pointer hover:underline shrink-0">
                                                        Cancel
                                                    </button>
                                                </form>
                                            ) : (
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <p className="text-richblack-5">{a.message}</p>
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-richblack-500">
                                                            <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                                                            {a.createdBy && <span>· {a.createdBy.firstName} {a.createdBy.lastName}</span>}
                                                        </div>
                                                        {a.startAt && (
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                                <span className="inline-flex items-center gap-1.5 bg-surface-raised border border-border-soft rounded-md px-2 py-1 text-xs text-richblack-300">
                                                                    <FaClock size={9} />
                                                                    {key === 'scheduled' ? `starts ${relativeLabel(a.startAt)}` : key === 'live' ? `ends ${relativeLabel(a.endAt)}` : `ended ${relativeLabel(a.endAt)}`}
                                                                </span>
                                                                <span className="text-richblack-600 text-[11px] font-mono">
                                                                    {new Date(a.startAt).toLocaleString()} → {new Date(a.endAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => startEdit(a)}
                                                            title="Edit"
                                                            className="w-7 h-7 flex items-center justify-center rounded-md text-richblack-400 hover:text-richblack-5 hover:bg-surface-hover cursor-pointer transition-colors"
                                                        >
                                                            <FaPen size={11} />
                                                        </button>
                                                        {a.active && (
                                                            <button
                                                                onClick={() => dispatch(DeactivateAnnouncement(a._id, token))}
                                                                title="Deactivate"
                                                                className="w-7 h-7 flex items-center justify-center rounded-md text-richblack-400 hover:text-richblack-5 hover:bg-surface-hover cursor-pointer transition-colors"
                                                            >
                                                                <FaEyeSlash size={11} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => dispatch(DeleteAnnouncement(a._id, token))}
                                                            title="Delete"
                                                            className="w-7 h-7 flex items-center justify-center rounded-md text-richblack-400 hover:text-danger-soft hover:bg-danger-soft/10 cursor-pointer transition-colors"
                                                        >
                                                            <FaTrash size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Announcements
