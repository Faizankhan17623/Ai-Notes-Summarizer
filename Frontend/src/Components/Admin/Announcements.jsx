import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAnnouncements, CreateAnnouncement, DeactivateAnnouncement } from '../../Services/operations/Admin.js'
import IconBtn from '../extra/IconBtn.jsx'
import StatusBadge from './StatusBadge.jsx'

const Announcements = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { announcements, loading } = useSelector((state) => state.admin)
    const [message, setMessage] = useState('')

    useEffect(() => {
        dispatch(GetAnnouncements(token))
    }, [dispatch, token])

    const handlePublish = (e) => {
        e.preventDefault()
        if (!message.trim()) return
        dispatch(CreateAnnouncement(message.trim(), token))
        setMessage('')
    }

    return (
        <div className="max-w-3xl px-6 md:px-10 py-10">
            <Helmet><title>Admin Announcements — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Announcements</h1>

            <form onSubmit={handlePublish} className="flex gap-2 mb-8">
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="New announcement message..."
                    className="flex-1 bg-surface border border-border-soft text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50 transition-colors"
                />
                <IconBtn text="Publish" type="submit" disabled={!message.trim()} />
            </form>

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
                        <div key={a._id} className="border border-border-soft bg-surface rounded-lg p-4 flex items-center justify-between gap-4">
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
                            {a.active && (
                                <button onClick={() => dispatch(DeactivateAnnouncement(a._id, token))} className="text-danger-soft text-xs font-medium cursor-pointer hover:underline shrink-0">
                                    Deactivate
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Announcements
