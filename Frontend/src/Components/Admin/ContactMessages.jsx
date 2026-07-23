import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaEnvelopeOpenText, FaReply, FaLock, FaChartLine } from 'react-icons/fa'
import { GetContactMessages, ReplyToContactMessage, AddInternalNote, GetTicketUserActivity } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const STATUS_TONE = { open: 'neutral', resolved: 'good' }

// lets Support/Billing/Admin see the submitter's recent AI usage right from the ticket sir,
// instead of separately searching for them on Users/Audit. Matched by email server-side —
// the submitter isn't guaranteed to have an account (public, pre-account form), so
// matched:false is a normal outcome here, not an error.
const UserActivityPanel = ({ messageId, token, dispatch }) => {
    const activity = useSelector((state) => state.admin.ticketActivity[messageId])

    useEffect(() => {
        if (activity === undefined) dispatch(GetTicketUserActivity(messageId, token))
    }, [dispatch, messageId, token, activity])

    if (!activity) {
        return <p className="text-richblack-500 text-xs px-1 py-2">Loading activity...</p>
    }
    if (!activity.matched) {
        return <p className="text-richblack-500 text-xs px-1 py-2">No account found for this email — likely a pre-signup visitor.</p>
    }

    const { user, recentAiLogs } = activity
    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-richblack-200">{user.role} · {user.SubType}</span>
                <StatusBadge tone={user.isBanned ? 'danger' : 'good'}>{user.isBanned ? 'Banned' : 'Active'}</StatusBadge>
                <span className="text-richblack-500">{user.count} credits used this cycle</span>
            </div>
            {recentAiLogs.length === 0 ? (
                <p className="text-richblack-500 text-xs">No AI activity recorded yet.</p>
            ) : (
                <ul className="space-y-1.5">
                    {recentAiLogs.slice(0, 8).map((log) => (
                        <li key={log._id} className="flex items-center justify-between gap-2 bg-surface-hover rounded-md px-3 py-1.5">
                            <span className="text-richblack-200 text-xs">
                                {log.type} · {log.model || '—'}
                                {!log.success && <span className="text-danger-soft ml-1.5">failed</span>}
                            </span>
                            <span className="text-richblack-500 text-xs shrink-0">{new Date(log.createdAt).toLocaleDateString()}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// one row, expands into a reply form sir — the whole "ticket" fits in a single card since this
// is a lightweight system (reply = resolve, no back-and-forth thread), not a full helpdesk
const MessageCard = ({ message, token, dispatch }) => {
    const [expanded, setExpanded] = useState(false)
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [noteText, setNoteText] = useState('')
    const [notesOpen, setNotesOpen] = useState(false)
    const [addingNote, setAddingNote] = useState(false)
    const [activityOpen, setActivityOpen] = useState(false)

    const handleReply = async (e) => {
        e.preventDefault()
        if (!reply.trim()) return
        setSending(true)
        const ok = await dispatch(ReplyToContactMessage(message._id, reply.trim(), token))
        setSending(false)
        if (ok) setExpanded(false)
    }

    const handleAddNote = async (e) => {
        e.preventDefault()
        if (!noteText.trim()) return
        setAddingNote(true)
        const ok = await dispatch(AddInternalNote(message._id, noteText.trim(), token))
        setAddingNote(false)
        if (ok) setNoteText('')
    }

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-richblack-5 font-medium">{message.name} <span className="text-richblack-400 font-normal text-sm">({message.email})</span></p>
                    <p className="text-richblack-200 text-sm mt-1 whitespace-pre-wrap">{message.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-richblack-500 text-xs">{new Date(message.createdAt).toLocaleString()}</span>
                        <StatusBadge tone={STATUS_TONE[message.status]}>{message.status}</StatusBadge>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => setActivityOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-richblack-300 cursor-pointer hover:underline"
                    >
                        <FaChartLine size={9} /> Activity
                    </button>
                    <button
                        onClick={() => setNotesOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-richblack-300 cursor-pointer hover:underline"
                    >
                        <FaLock size={9} /> Notes{message.internalNotes?.length ? ` (${message.internalNotes.length})` : ''}
                    </button>
                    {message.status === 'open' && (
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            className="flex items-center gap-1.5 text-xs font-medium text-yellow-50 cursor-pointer hover:underline"
                        >
                            <FaReply size={10} /> Reply
                        </button>
                    )}
                </div>
            </div>

            {message.status === 'resolved' && message.replyMessage && (
                <div className="mt-3 pt-3 border-t border-border-soft bg-surface-hover -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                    <p className="text-richblack-400 text-xs mb-1">
                        Replied by {message.repliedBy?.firstName} {message.repliedBy?.lastName} · {new Date(message.repliedAt).toLocaleString()}
                    </p>
                    <p className="text-richblack-200 text-sm whitespace-pre-wrap">{message.replyMessage}</p>
                </div>
            )}

            {activityOpen && (
                <div className="mt-3 pt-3 border-t border-dashed border-border-soft">
                    <UserActivityPanel messageId={message._id} token={token} dispatch={dispatch} />
                </div>
            )}

            {notesOpen && (
                <div className="mt-3 pt-3 border-t border-dashed border-border-soft space-y-2.5">
                    <p className="text-richblack-500 text-xs flex items-center gap-1.5">
                        <FaLock size={9} /> Private — only Support/Admin can see this, never sent to the submitter
                    </p>
                    {message.internalNotes?.length > 0 && (
                        <div className="space-y-2">
                            {message.internalNotes.map((n, i) => (
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
                        placeholder="Write your reply — this gets emailed to them and marks the ticket resolved..."
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

const ContactMessages = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { contactMessages, loading } = useSelector((state) => state.admin)
    const [statusFilter, setStatusFilter] = useState('open')

    useEffect(() => {
        dispatch(GetContactMessages(token))
    }, [dispatch, token])

    const filtered = useMemo(
        () => statusFilter === 'all' ? contactMessages : contactMessages.filter((m) => m.status === statusFilter),
        [contactMessages, statusFilter]
    )

    return (
        <div className="max-w-3xl px-6 md:px-10 py-10">
            <Helmet><title>Contact Messages — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Contact messages</h1>

            <div className="flex gap-1.5 mb-6">
                {['open', 'resolved', 'all'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors capitalize ${statusFilter === s ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                    <FaEnvelopeOpenText className="text-richblack-600 text-3xl mx-auto mb-4" />
                    <p className="text-richblack-300 text-sm">No {statusFilter !== 'all' ? statusFilter : ''} messages.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((m) => (
                        <MessageCard key={m._id} message={m} token={token} dispatch={dispatch} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default ContactMessages
