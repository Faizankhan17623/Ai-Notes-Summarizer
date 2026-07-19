import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { FaUsers, FaGlobe, FaEye, FaSignInAlt } from 'react-icons/fa'
import { GetTraffic } from '../../Services/operations/Admin.js'

const RANGES = [
    { key: 'day', label: '24 hours' },
    { key: 'week', label: '7 days' },
    { key: 'month', label: '30 days' },
    { key: 'custom', label: 'Custom' },
]

const StatCard = ({ label, value, icon: Icon }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-richblack-400">{label}</p>
            <Icon className="text-richblack-500" size={14} />
        </div>
        <p className="font-mono text-2xl text-richblack-5">{value}</p>
    </div>
)

// same dark/light-aware tooltip card as Analytics.jsx sir — recharts' default ignores the
// app's theme tokens entirely, so every chart in the admin panel shares this one instead
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-surface-raised border border-border-soft rounded-md px-3 py-2 text-xs shadow-lg">
            <p className="text-richblack-400 mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    )
}

// two series on one chart sir — total visits (all page views) vs unique visitors
// (de-duplicated by the visitor_id cookie within each bucket), so the gap between the
// two lines itself tells the story of how much repeat traffic there is
const TrafficChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-richblack-400 text-sm">No traffic recorded in this window yet.</p>
    }
    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
                <XAxis
                    dataKey="bucket"
                    tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border-soft)' }}
                    minTickGap={24}
                />
                <YAxis
                    tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-border-soft)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-richblack-300)' }} />
                <Line
                    type="monotone"
                    dataKey="visits"
                    name="Total visits"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--color-chart-1)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                />
                <Line
                    type="monotone"
                    dataKey="uniqueVisitors"
                    name="Unique visitors"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--color-chart-2)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}

const Traffic = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { traffic, trafficLoading } = useSelector((state) => state.admin)

    const [range, setRange] = useState('week')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')

    useEffect(() => {
        if (range === 'custom') {
            if (!customFrom || !customTo) return
            dispatch(GetTraffic(token, 'custom', customFrom, customTo))
            return
        }
        dispatch(GetTraffic(token, range))
    }, [dispatch, token, range, customFrom, customTo])

    const totals = traffic?.totals

    return (
        <div className="px-6 md:px-10 py-10 space-y-6">
            <Helmet><title>Traffic — Notewise Admin</title></Helmet>

            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="font-display text-3xl font-semibold text-richblack-5">Traffic</h1>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-surface-raised border border-border-soft rounded-md p-1">
                        {RANGES.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setRange(key)}
                                className={`px-3.5 py-1.5 rounded text-sm font-medium cursor-pointer transition-all
                                    ${range === key ? "bg-yellow-50 text-richblack-900" : "text-richblack-300 hover:text-richblack-5"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="bg-surface-raised border border-border-soft rounded-md px-3 py-1.5 text-sm text-richblack-5 outline-none focus:border-yellow-50 transition-colors"
                            />
                            <span className="text-richblack-500 text-sm">to</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="bg-surface-raised border border-border-soft rounded-md px-3 py-1.5 text-sm text-richblack-5 outline-none focus:border-yellow-50 transition-colors"
                            />
                        </div>
                    )}
                </div>
            </div>

            {trafficLoading || !traffic ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Unique visitors" value={totals.uniqueVisitors} icon={FaUsers} />
                        <StatCard label="Total page views" value={totals.totalVisits} icon={FaEye} />
                        <StatCard label="Unique IP addresses" value={totals.uniqueIps} icon={FaGlobe} />
                        <StatCard label="Views from logged-in users" value={totals.loggedInVisits} icon={FaSignInAlt} />
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-4">Visits over time</h2>
                        <TrafficChart data={traffic.series} />
                    </div>

                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-4">Most-visited pages</h2>
                        {traffic.topPaths.length === 0 ? (
                            <p className="text-richblack-400 text-sm">No page views in this window yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-richblack-400 border-b border-border-soft">
                                            <th className="py-2 pr-4 font-medium">Page</th>
                                            <th className="py-2 pr-4 font-medium">Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {traffic.topPaths.map((row) => (
                                            <tr key={row._id} className="border-b border-border-soft last:border-b-0 text-richblack-200">
                                                <td className="py-2 pr-4 font-mono">{row._id}</td>
                                                <td className="py-2 pr-4 font-mono font-semibold text-richblack-5">{row.visits}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default Traffic
