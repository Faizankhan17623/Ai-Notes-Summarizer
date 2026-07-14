import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAnalytics } from '../../Services/operations/Admin.js'

const StatCard = ({ label, value }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-5">
        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">{label}</p>
        <p className="font-mono text-2xl text-richblack-5">{value}</p>
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
                        <div className="text-[10px] text-richblack-400 mb-1 opacity-0 group-hover:opacity-100 whitespace-nowrap absolute -top-5 bg-surface-raised border border-border-soft px-1.5 py-0.5 rounded">
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
        <div className="px-6 md:px-10 py-10 space-y-6">
            <Helmet><title>Admin Analytics — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5">Analytics</h1>

            {loading || !analytics ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-4">Revenue — last 30 days</h2>
                        <BarChart data={analytics.revenue.byDay} valueKey="total" formatValue={(v) => `₹${v}`} />
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-4">New signups — last 30 days</h2>
                        <BarChart data={analytics.signups.byDay} valueKey="count" />
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-4">Top users by usage — last 30 days</h2>
                        {analytics.topUsers.length === 0 ? (
                            <p className="text-richblack-400 text-sm">No usage in this window yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-richblack-400 border-b border-border-soft">
                                            <th className="py-2 pr-4 font-medium">User</th>
                                            <th className="py-2 pr-4 font-medium">Notes</th>
                                            <th className="py-2 pr-4 font-medium">Chats</th>
                                            <th className="py-2 pr-4 font-medium">AI calls</th>
                                            <th className="py-2 pr-4 font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.topUsers.map((row) => (
                                            <tr key={row.userId} className="border-b border-border-soft last:border-b-0 text-richblack-200">
                                                <td className="py-2 pr-4">
                                                    {row.user ? `${row.user.firstName} ${row.user.lastName}` : 'Deleted user'}
                                                </td>
                                                <td className="py-2 pr-4 font-mono">{row.notes}</td>
                                                <td className="py-2 pr-4 font-mono">{row.chats}</td>
                                                <td className="py-2 pr-4 font-mono">{row.aiCalls}</td>
                                                <td className="py-2 pr-4 font-mono font-semibold text-richblack-5">{row.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6">
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
    )
}

export default Analytics
