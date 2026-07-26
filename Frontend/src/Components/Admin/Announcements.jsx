import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAnnouncements, CreateAnnouncement, EditAnnouncement, DeactivateAnnouncement, DeleteAnnouncement } from '../../Services/operations/Admin.js'
import IconBtn from '../extra/IconBtn.jsx'
import StatusBadge from './StatusBadge.jsx'

// mirrors MAX_ACTIVE_ANNOUNCEMENTS in Backend/controllers/Admin.js sir — kept in sync there,
// not derived from the response, so the Publish form can disable itself before the admin
// even submits rather than only finding out from the 400
const MAX_ACTIVE_ANNOUNCEMENTS = 3

const Announcements = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { announcements, loading } = useSelector((state) => state.admin)
    const [message, setMessage] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    useEffect(() => {
        dispatch(GetAnnouncements(token))
    }, [dispatch, token])

    const activeCount = useMemo(() => announcements.filter((a) => a.active).length, [announcements])
    const atLimit = activeCount >= MAX_ACTIVE_ANNOUNCEMENTS

    const handlePublish = (e) => {
        e.preventDefault()
        if (!message.trim() || atLimit) return
        dispatch(CreateAnnouncement(message.trim(), token))
        setMessage('')
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
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Announcements</h1>

            <form onSubmit={handlePublish} className="mb-2">
                <div className="flex gap-2">
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={atLimit ? `Limit of ${MAX_ACTIVE_ANNOUNCEMENTS} active reached — deactivate one first` : "New announcement message..."}
                        disabled={atLimit}
                        className="flex-1 bg-surface border border-border-soft text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50 transition-colors disabled:opacity-50"
                    />
                    <IconBtn text="Publish" type="submit" disabled={!message.trim() || atLimit} />
                </div>
            </form>
            <p className="text-richblack-500 text-xs mb-8">{activeCount} / {MAX_ACTIVE_ANNOUNCEMENTS} active</p>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : announcements.length === 0 ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                    <p className="text-richblack-400 text-sm">No announcements yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((a) => (
                        <div key={a._id} className="border border-border-soft bg-surface rounded-lg p-4">
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
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-richblack-5">{a.message}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-richblack-400 text-xs">{new Date(a.createdAt).toLocaleString()}</span>
                                            {a.createdBy && (
                                                <span className="text-richblack-500 text-xs">· by {a.createdBy.firstName} {a.createdBy.lastName}</span>
                                            )}
                                            {a.active ? <StatusBadge tone="good">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button onClick={() => startEdit(a)} className="text-richblack-300 text-xs font-medium cursor-pointer hover:underline">
                                            Edit
                                        </button>
                                        {a.active && (
                                            <button onClick={() => dispatch(DeactivateAnnouncement(a._id, token))} className="text-richblack-300 text-xs font-medium cursor-pointer hover:underline">
                                                Deactivate
                                            </button>
                                        )}
                                        <button onClick={() => dispatch(DeleteAnnouncement(a._id, token))} className="text-danger-soft text-xs font-medium cursor-pointer hover:underline">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Announcements
