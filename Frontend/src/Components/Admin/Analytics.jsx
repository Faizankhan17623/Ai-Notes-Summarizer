import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAnalytics } from '../../Services/operations/Admin.js'
import Navbar from '../Home/Navbar.jsx'
import AdminNav from './AdminNav.jsx'
import Loading from '../extra/Loading.jsx'

const StatCard = ({ label, value }) => (
    <div className="border border-richblack-700 rounded-lg p-6">
        <p className="text-richblack-400 text-sm mb-1">{label}</p>
        <p className="text-3xl font-bold text-richblack-5">{value}</p>
    </div>
)

// simple dependency-free bar chart sir — one hue for a single magnitude series,
// thin bars with rounded data-ends, a shared baseline, direct axis labels only at
// the min/max ticks to avoid clutter
const BarChart = ({ data, valueKey, formatValue = (v) => v }) => {
    if (!data || data.length === 0) {
        return <p className="text-richblack-400 text-sm">No data in this window yet.</p>
    }

    const max = Math.max(...data.map((d) => d[valueKey]), 1)

    return (
        <div className="flex items-end gap-1 h-40 overflow-x-auto">
            {data.map((d) => {
                const heightPct = Math.max((d[valueKey] / max) * 100, 2)
                return (
                    <div key={d._id} className="flex flex-col items-center justify-end h-full min-w-[10px] flex-1 group relative">
                        <div className="text-[10px] text-richblack-400 mb-1 opacity-0 group-hover:opacity-100 whitespace-nowrap absolute -top-5 bg-richblack-800 px-1.5 py-0.5 rounded">
                            {d._id}: {formatValue(d[valueKey])}
                        </div>
                        <div
                            className="w-full bg-yellow-50 rounded-t-sm"
                            style={{ height: `${heightPct}%` }}
                        />
                    </div>
                )
            })}
        </div>
    )
}

const Analytics = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { analytics, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetAnalytics(token))
    }, [dispatch, token])

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Admin Analytics — AI Notes Summarizer</title></Helmet>
            <Navbar />
            <AdminNav />

            <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
                <h1 className="text-2xl font-bold text-richblack-5">Analytics</h1>

                {loading || !analytics ? (
                    <Loading text="Loading analytics..." />
                ) : (
                    <>
                        <div className="border border-richblack-700 rounded-lg p-6">
                            <h2 className="text-richblack-5 font-semibold mb-4">Revenue — last 30 days</h2>
                            <BarChart data={analytics.revenue.byDay} valueKey="total" formatValue={(v) => `₹${v}`} />
                        </div>

                        <div className="border border-richblack-700 rounded-lg p-6">
                            <h2 className="text-richblack-5 font-semibold mb-4">New signups — last 30 days</h2>
                            <BarChart data={analytics.signups.byDay} valueKey="count" />
                        </div>

                        <div className="border border-richblack-700 rounded-lg p-6">
                            <h2 className="text-richblack-5 font-semibold mb-4">Top users by usage — last 30 days</h2>
                            {analytics.topUsers.length === 0 ? (
                                <p className="text-richblack-400 text-sm">No usage in this window yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="text-richblack-400 border-b border-richblack-700">
                                                <th className="py-2 pr-4">User</th>
                                                <th className="py-2 pr-4">Notes</th>
                                                <th className="py-2 pr-4">Chats</th>
                                                <th className="py-2 pr-4">AI calls</th>
                                                <th className="py-2 pr-4">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.topUsers.map((row) => (
                                                <tr key={row.userId} className="border-b border-richblack-800 text-richblack-200">
                                                    <td className="py-2 pr-4">
                                                        {row.user ? `${row.user.firstName} ${row.user.lastName}` : 'Deleted user'}
                                                    </td>
                                                    <td className="py-2 pr-4">{row.notes}</td>
                                                    <td className="py-2 pr-4">{row.chats}</td>
                                                    <td className="py-2 pr-4">{row.aiCalls}</td>
                                                    <td className="py-2 pr-4 font-semibold text-richblack-5">{row.total}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="border border-richblack-700 rounded-lg p-6">
                            <h2 className="text-richblack-5 font-semibold mb-4">Credit &amp; top-up stats</h2>
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                {analytics.creditStats.usersAtLimit.map((row) => (
                                    <StatCard key={row._id} label={`${row._id} users at their limit`} value={row.usersAtLimit} />
                                ))}
                                <StatCard label="Top-up purchases (all time)" value={analytics.creditStats.topUps.totals.totalPurchases} />
                                <StatCard label="Top-up revenue (all time)" value={`₹${analytics.creditStats.topUps.totals.totalRevenue}`} />
                                <StatCard label="Top-up credits granted (all time)" value={analytics.creditStats.topUps.totals.totalCreditsGranted} />
                            </div>
                            <h3 className="text-richblack-200 text-sm font-semibold mb-2">Top-up purchases — last 30 days</h3>
                            <BarChart data={analytics.creditStats.topUps.byDay} valueKey="count" />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Analytics
