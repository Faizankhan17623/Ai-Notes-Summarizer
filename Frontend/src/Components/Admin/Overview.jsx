import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetOverview } from '../../Services/operations/Admin.js'

const StatCard = ({ label, value, tone }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-5">
        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">{label}</p>
        <p className={`font-mono text-2xl ${tone === 'danger' ? 'text-danger-soft' : 'text-richblack-5'}`}>{value}</p>
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
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Admin Overview — AI Notes Summarizer</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-8">Overview</h1>

            {loading || !overview ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <StatCard label="Total users" value={overview.userCount} />
                        <StatCard label="Total notes" value={overview.noteCount} />
                        <StatCard label="Total chats" value={overview.chatCount} />
                        <StatCard label="AI calls (24h)" value={overview.aiCallsLast24h} />
                        <StatCard label="AI failures (24h)" value={overview.aiFailuresLast24h} tone={overview.aiFailuresLast24h > 0 ? 'danger' : undefined} />
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6 max-w-md">
                        <h2 className="text-richblack-5 font-semibold mb-4">Plan breakdown</h2>
                        <div className="space-y-3">
                            {overview.planBreakdown.map((p) => (
                                <div key={p._id} className="flex justify-between items-center text-sm">
                                    <span className="text-richblack-200">{p._id || 'Unknown'}</span>
                                    <span className="font-mono text-richblack-5">{p.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default Overview
