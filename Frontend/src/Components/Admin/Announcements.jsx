import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAnnouncements, CreateAnnouncement, DeactivateAnnouncement } from '../../Services/operations/Admin.js'
import Navbar from '../Home/Navbar.jsx'
import AdminNav from './AdminNav.jsx'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'

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
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Admin Announcements — AI Notes Summarizer</title></Helmet>
            <Navbar />
            <AdminNav />

            <div className="max-w-3xl mx-auto px-6 py-10">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Announcements</h1>

                <form onSubmit={handlePublish} className="flex gap-2 mb-8">
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="New announcement message..."
                        className="flex-1 bg-richblack-800 border border-richblack-700 text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50"
                    />
                    <IconBtn text="Publish" type="submit" disabled={!message.trim()} />
                </form>

                {loading ? (
                    <Loading text="Loading announcements..." />
                ) : (
                    <div className="space-y-3">
                        {announcements.map((a) => (
                            <div key={a._id} className="border border-richblack-700 rounded-md p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-richblack-5">{a.message}</p>
                                    <p className="text-richblack-400 text-xs mt-1">{new Date(a.createdAt).toLocaleString()} — {a.active ? <span className="text-caribbeangreen-300">Active</span> : "Inactive"}</p>
                                </div>
                                {a.active && (
                                    <button onClick={() => dispatch(DeactivateAnnouncement(a._id, token))} className="text-pink-200 text-sm cursor-pointer">
                                        Deactivate
                                    </button>
                                )}
                            </div>
                        ))}
                        {announcements.length === 0 && <p className="text-richblack-400 text-sm">No announcements yet.</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Announcements
