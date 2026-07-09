import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaPlus, FaHistory } from 'react-icons/fa'
import { GetAllNotes } from '../../Services/operations/Notes.js'
import { GetProfile } from '../../Services/operations/Auth.js'
import Navbar from '../Home/Navbar.jsx'

const DashboardHome = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { allNotes } = useSelector((state) => state.notes)
    const { plan } = useSelector((state) => state.profile)

    useEffect(() => {
        dispatch(GetAllNotes(token))
        dispatch(GetProfile(token))
    }, [dispatch, token])

    const recent = allNotes.slice(0, 5)

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Dashboard — AI Notes Summarizer</title></Helmet>
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-richblack-5 mb-1">Welcome back, {user?.firstName}</h1>
                {plan && (
                    <p className="text-richblack-300 text-sm mb-8">
                        {plan.name} plan — {plan.creditsLimit === null ? "unlimited" : `${plan.creditsUsed}/${plan.creditsLimit}`} summaries used this month
                    </p>
                )}

                <div className="grid md:grid-cols-2 gap-4 mb-10">
                    <Link to="/Dashboard/New-Summary" className="border border-richblack-700 rounded-lg p-6 hover:border-yellow-50 transition-all">
                        <FaPlus className="text-yellow-50 text-xl mb-3" />
                        <h2 className="text-richblack-5 font-semibold mb-1">New Summary</h2>
                        <p className="text-richblack-300 text-sm">Paste, upload, or dictate your notes</p>
                    </Link>
                    <Link to="/Dashboard/History" className="border border-richblack-700 rounded-lg p-6 hover:border-yellow-50 transition-all">
                        <FaHistory className="text-yellow-50 text-xl mb-3" />
                        <h2 className="text-richblack-5 font-semibold mb-1">History</h2>
                        <p className="text-richblack-300 text-sm">Browse your past summaries</p>
                    </Link>
                </div>

                <h2 className="text-richblack-5 font-semibold mb-4">Recent notes</h2>
                {recent.length === 0 ? (
                    <p className="text-richblack-400 text-sm">No notes yet — create your first summary above.</p>
                ) : (
                    <div className="space-y-3">
                        {recent.map((note) => (
                            <Link key={note._id} to={`/Dashboard/Note/${note._id}`} className="block border border-richblack-700 rounded-md p-4 hover:border-yellow-50 transition-all">
                                <p className="text-richblack-5 font-medium">{note.title}</p>
                                <p className="text-richblack-400 text-xs mt-1">{new Date(note.createdAt).toLocaleString()} · {note.sourceType}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default DashboardHome
