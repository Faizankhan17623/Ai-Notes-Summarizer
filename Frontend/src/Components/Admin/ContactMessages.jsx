import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaEnvelopeOpenText, FaReply } from 'react-icons/fa'
import { GetContactMessages, ReplyToContactMessage } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const STATUS_TONE = { open: 'neutral', resolved: 'good' }

// one row, expands into a reply form sir — the whole "ticket" fits in a single card since this
// is a lightweight system (reply = resolve, no back-and-forth thread), not a full helpdesk
const MessageCard = ({ message, token, dispatch }) => {
    const [expanded, setExpanded] = useState(false)
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)

    const handleReply = async (e) => {
        e.preventDefault()
        if (!reply.trim()) return
        setSending(true)
        const ok = await dispatch(ReplyToContactMessage(message._id, reply.trim(), token))
        setSending(false)
        if (ok) setExpanded(false)
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
                {message.status === 'open' && (
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-yellow-50 cursor-pointer hover:underline shrink-0"
                    >
                        <FaReply size={10} /> Reply
                    </button>
                )}
            </div>

            {message.status === 'resolved' && message.replyMessage && (
                <div className="mt-3 pt-3 border-t border-border-soft bg-surface-hover -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                    <p className="text-richblack-400 text-xs mb-1">
                        Replied by {message.repliedBy?.firstName} {message.repliedBy?.lastName} · {new Date(message.repliedAt).toLocaleString()}
                    </p>
                    <p className="text-richblack-200 text-sm whitespace-pre-wrap">{message.replyMessage}</p>
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
