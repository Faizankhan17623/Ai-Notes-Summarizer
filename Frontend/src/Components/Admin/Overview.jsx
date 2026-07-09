import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetOverview } from '../../Services/operations/Admin.js'
import Navbar from '../Home/Navbar.jsx'
import AdminNav from './AdminNav.jsx'
import Loading from '../extra/Loading.jsx'

const StatCard = ({ label, value }) => (
    <div className="border border-richblack-700 rounded-lg p-6">
        <p className="text-richblack-400 text-sm mb-1">{label}</p>
        <p className="text-3xl font-bold text-richblack-5">{value}</p>
    </div>
)

const Overview = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { overview, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetOverview(token))
    }, [dispatch, token])

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Admin Overview — AI Notes Summarizer</title></Helmet>
            <Navbar />
            <AdminNav />

            <div className="max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Overview</h1>

                {loading || !overview ? (
                    <Loading text="Loading overview..." />
                ) : (
                    <>
                        <div className="grid md:grid-cols-3 gap-4 mb-8">
                            <StatCard label="Total users" value={overview.userCount} />
                            <StatCard label="Total notes" value={overview.noteCount} />
                            <StatCard label="Total chats" value={overview.chatCount} />
                            <StatCard label="AI calls (24h)" value={overview.aiCallsLast24h} />
                            <StatCard label="AI failures (24h)" value={overview.aiFailuresLast24h} />
                        </div>

                        <div className="border border-richblack-700 rounded-lg p-6">
                            <h2 className="text-richblack-5 font-semibold mb-4">Plan breakdown</h2>
                            <div className="space-y-2">
                                {overview.planBreakdown.map((p) => (
                                    <div key={p._id} className="flex justify-between text-richblack-200 text-sm">
                                        <span>{p._id || 'Unknown'}</span>
                                        <span>{p.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Overview
