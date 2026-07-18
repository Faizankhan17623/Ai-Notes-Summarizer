import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts'
import { GetAnalytics } from '../../Services/operations/Admin.js'

const StatCard = ({ label, value }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-5">
        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-2">{label}</p>
        <p className="font-mono text-2xl text-richblack-5">{value}</p>
    </div>
)

// shared tooltip sir — one dark/light-aware card instead of recharts' default (which
// ignores the app's theme tokens entirely)
const ChartTooltip = ({ active, payload, label, formatValue = (v) => v }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-surface-raised border border-border-soft rounded-md px-3 py-2 text-xs shadow-lg">
            <p className="text-richblack-400 mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="text-richblack-5 font-mono font-semibold">
                    {formatValue(p.value)}
                </p>
            ))}
        </div>
    )
}

// revenue over time sir — a single magnitude series, so a filled area (not a categorical
// palette) reads best; thin 2px line, gridlines recessive, direct axis labels only at the
// ticks recharts already chooses (no per-point label clutter)
const RevenueChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-richblack-400 text-sm">No revenue in this window yet.</p>
    }
    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
                <XAxis
                    dataKey="_id"
                    tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border-soft)' }}
                    minTickGap={24}
                />
                <YAxis
                    tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                    width={56}
                />
                <Tooltip content={<ChartTooltip formatValue={(v) => `₹${v}`} />} cursor={{ stroke: 'var(--color-border-soft)' }} />
                <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--color-chart-1)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

// discrete daily counts sir — bars fit better than a line for signups/top-ups, same
// thin-mark + recessive-grid treatment, rounded data-ends via radius
const CountBarChart = ({ data, valueKey, color, formatValue = (v) => v }) => {
    if (!data || data.length === 0) {
        return <p className="text-richblack-400 text-sm">No data in this window yet.</p>
    }
    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
                <XAxis
                    dataKey="_id"
                    tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border-soft)' }}
                    minTickGap={24}
                />
                <YAxis tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip formatValue={formatValue} />} cursor={{ fill: 'var(--color-surface-hover)' }} />
                <Bar dataKey={valueKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
        </ResponsiveContainer>
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
                        <RevenueChart data={analytics.revenue.byDay} />
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-4">New signups — last 30 days</h2>
                        <CountBarChart data={analytics.signups.byDay} valueKey="count" color="var(--color-chart-2)" />
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
                        <CountBarChart data={analytics.creditStats.topUps.byDay} valueKey="count" color="var(--color-chart-3)" />
                    </div>
                </>
            )}
        </div>
    )
}

export default Analytics
