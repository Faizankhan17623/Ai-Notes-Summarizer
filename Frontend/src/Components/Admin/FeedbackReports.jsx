import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaBug, FaLightbulb, FaReply, FaLock, FaImage, FaTrash } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetFeedbackReports, ReplyToFeedbackReport, AddFeedbackNote, SetReportStatus, DeleteReport } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const STATUS_TONE = { open: 'neutral', in_progress: 'neutral', planned: 'neutral', resolved: 'good', declined: 'danger' }
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', planned: 'Planned', resolved: 'Resolved', declined: 'Declined' }
const STATUSES = ['open', 'in_progress', 'planned', 'resolved', 'declined']
const TYPE_ICON = { bug: FaBug, feature: FaLightbulb }
const TYPE_LABEL = { bug: 'Bug', feature: 'Feature' }

// one card, expands into a reply form sir — same shape as ContactMessages.jsx's MessageCard,
// this feedback system deliberately mirrors that one closely (see Backend/Models/
// FeedbackReport.js's comment) rather than inventing a different admin UI pattern
const ReportCard = ({ report, token, dispatch, isAdmin }) => {
    const [expanded, setExpanded] = useState(false)
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [noteText, setNoteText] = useState('')
    const [notesOpen, setNotesOpen] = useState(false)
    const [addingNote, setAddingNote] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const TypeIcon = TYPE_ICON[report.type]

    const handleReply = async (e) => {
        e.preventDefault()
        if (!reply.trim()) return
        setSending(true)
        const ok = await dispatch(ReplyToFeedbackReport(report._id, reply.trim(), token))
        setSending(false)
        if (ok) setExpanded(false)
    }

    const handleAddNote = async (e) => {
        e.preventDefault()
        if (!noteText.trim()) return
        setAddingNote(true)
        const ok = await dispatch(AddFeedbackNote(report._id, noteText.trim(), token))
        setAddingNote(false)
        if (ok) setNoteText('')
    }

    const handleStatusChange = async (e) => {
        const status = e.target.value
        if (status === report.status) return
        setUpdatingStatus(true)
        await dispatch(SetReportStatus(report._id, status, token))
        setUpdatingStatus(false)
    }

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'Delete this report?',
            text: "This can't be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#ef4444',
            background: '#161d29',
            color: '#f1f2ff',
        })
        if (!result.isConfirmed) return
        setDeleting(true)
        await dispatch(DeleteReport(report._id, token))
        setDeleting(false)
    }

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <TypeIcon size={12} className="text-yellow-50 shrink-0" />
                        <p className="text-richblack-5 font-medium">{report.title}</p>
                    </div>
                    <p className="text-richblack-400 text-xs">
                        {report.submittedBy?.firstName} {report.submittedBy?.lastName} ({report.submittedBy?.email})
                        {report.route && <> · <code className="bg-surface-hover px-1.5 py-0.5 rounded">{report.route}</code></>}
                    </p>
                    <p className="text-richblack-200 text-sm mt-2 whitespace-pre-wrap">{report.description}</p>
                    {report.screenshotUrl && (
                        <a
                            href={report.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2"
                        >
                            <img
                                src={report.screenshotUrl}
                                alt="Attached screenshot"
                                className="max-h-40 rounded-md border border-border-soft hover:border-yellow-50/40 transition-colors"
                            />
                        </a>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-richblack-500 text-xs">{new Date(report.createdAt).toLocaleString()}</span>
                        <StatusBadge tone={STATUS_TONE[report.status]}>{STATUS_LABEL[report.status] || report.status}</StatusBadge>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <select
                        value={report.status}
                        onChange={handleStatusChange}
                        disabled={updatingStatus}
                        className="bg-surface-hover border border-border-soft text-richblack-200 text-xs rounded-md px-2 py-1.5 outline-none focus:border-yellow-50 cursor-pointer disabled:opacity-50"
                        title="Update status"
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setNotesOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-richblack-300 cursor-pointer hover:underline"
                    >
                        <FaLock size={9} /> Notes{report.internalNotes?.length ? ` (${report.internalNotes.length})` : ''}
                    </button>
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-yellow-50 cursor-pointer hover:underline"
                    >
                        <FaReply size={10} /> Reply
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            title="Delete report"
                            className="text-richblack-400 hover:text-danger-soft cursor-pointer disabled:opacity-50"
                        >
                            <FaTrash size={11} />
                        </button>
                    )}
                </div>
            </div>

            {report.replyMessage && (
                <div className="mt-3 pt-3 border-t border-border-soft bg-surface-hover -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                    <p className="text-richblack-400 text-xs mb-1">
                        Replied by {report.repliedBy?.firstName} {report.repliedBy?.lastName} · {new Date(report.repliedAt).toLocaleString()}
                    </p>
                    <p className="text-richblack-200 text-sm whitespace-pre-wrap">{report.replyMessage}</p>
                </div>
            )}

            {notesOpen && (
                <div className="mt-3 pt-3 border-t border-dashed border-border-soft space-y-2.5">
                    <p className="text-richblack-500 text-xs flex items-center gap-1.5">
                        <FaLock size={9} /> Private — only Support/Admin can see this, never sent to the submitter
                    </p>
                    {report.internalNotes?.length > 0 && (
                        <div className="space-y-2">
                            {report.internalNotes.map((n, i) => (
                                <div key={i} className="bg-surface-hover rounded-md px-3 py-2">
                                    <p className="text-richblack-200 text-sm whitespace-pre-wrap">{n.text}</p>
                                    <p className="text-richblack-500 text-xs mt-1">
                                        {n.author?.firstName} {n.author?.lastName} · {new Date(n.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleAddNote} className="flex gap-2">
                        <input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note for other agents..."
                            className="flex-1 bg-surface-hover border border-border-soft text-richblack-5 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!noteText.trim() || addingNote}
                            className="bg-surface-hover border border-border-soft text-richblack-200 text-xs font-semibold rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-yellow-50 shrink-0"
                        >
                            {addingNote ? "Adding..." : "Add"}
                        </button>
                    </form>
                </div>
            )}

            {expanded && (
                <form onSubmit={handleReply} className="mt-3 pt-3 border-t border-border-soft space-y-2">
                    <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                        placeholder="Write your reply — this gets emailed to them and marks the report resolved..."
                        className="w-full bg-surface-hover border border-border-soft text-richblack-5 text-sm rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={!reply.trim() || sending}
                            className="bg-yellow-50 text-richblack-900 text-xs font-semibold rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? "Sending..." : "Send & resolve"}
                        </button>
                        <button type="button" onClick={() => setExpanded(false)} className="text-richblack-300 text-xs cursor-pointer hover:underline">
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}

const FeedbackReports = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { feedbackReports, loading } = useSelector((state) => state.admin)
    const [typeFilter, setTypeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('open')
    // delete is Admin-only sir — Support can triage (reply, note, change status) but the
    // backend 403s the delete route for Support, so hide the button rather than let them
    // click something that just fails (same pattern as Users.jsx's isAdmin gate)
    const isAdmin = user?.role === 'Admin'

    useEffect(() => {
        dispatch(GetFeedbackReports(token))
    }, [dispatch, token])

    const filtered = useMemo(
        () => feedbackReports.filter((r) =>
            (typeFilter === 'all' || r.type === typeFilter) &&
            (statusFilter === 'all' || r.status === statusFilter)
        ),
        [feedbackReports, typeFilter, statusFilter]
    )

    return (
        <div className="max-w-3xl px-6 md:px-10 py-10">
            <Helmet><title>Bug Reports & Feature Suggestions — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Bug reports & feature suggestions</h1>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex gap-1.5">
                    {['all', 'bug', 'feature'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors capitalize ${typeFilter === t ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                        >
                            {t === 'all' ? 'All types' : TYPE_LABEL[t]}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {['all', ...STATUSES].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors ${statusFilter === s ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                        >
                            {s === 'all' ? 'All statuses' : STATUS_LABEL[s]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                    <FaImage className="text-richblack-600 text-3xl mx-auto mb-4" />
                    <p className="text-richblack-300 text-sm">No {statusFilter !== 'all' ? STATUS_LABEL[statusFilter]?.toLowerCase() : ''} reports.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((r) => (
                        <ReportCard key={r._id} report={r} token={token} dispatch={dispatch} isAdmin={isAdmin} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FeedbackReports
