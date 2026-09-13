import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { GetMyAnalytics } from '../../Services/operations/Analytics.js'

const StatBox = ({ label, value }) => (
    <div className="border border-border-soft bg-surface-hover rounded-md p-3 text-center">
        <p className="font-mono text-yellow-50 font-bold text-lg">{value}</p>
        <p className="text-richblack-400 text-xs mt-0.5">{label}</p>
    </div>
)

// same dark/light-aware tooltip card as the Admin charts (Analytics.jsx/Payments.jsx/
// Traffic.jsx) sir — recharts' default tooltip ignores the app's theme tokens entirely
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-surface-raised border border-border-soft rounded-md px-3 py-2 text-xs shadow-lg">
            <p className="text-richblack-400 mb-1">{label}</p>
            <p className="text-richblack-5 font-mono font-semibold">{payload[0].value} notes</p>
        </div>
    )
}

const AnalyticsWidget = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { data } = useSelector((state) => state.analytics)

    useEffect(() => {
        dispatch(GetMyAnalytics(token))
    }, [dispatch, token])

    if (!data) return null

    const chartData = data.notesByDay.map((d) => ({ date: d._id.slice(5), count: d.count }))

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-6 mb-10">
            <h2 className="text-richblack-5 font-semibold mb-4">Your activity</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Notes" value={data.noteCount} />
                <StatBox label="Chats" value={data.chatCount} />
                <StatBox label="Flashcards" value={data.flashcardCount} />
                <StatBox label="Avg quiz score" value={data.avgQuizScore !== null ? `${data.avgQuizScore}%` : '—'} />
            </div>

            {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="myActivityFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--color-border-soft)' }}
                            minTickGap={24}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fill: 'var(--color-richblack-400)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-border-soft)' }} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            name="Notes"
                            stroke="var(--color-chart-1)"
                            strokeWidth={2}
                            fill="url(#myActivityFill)"
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--color-chart-1)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                            isAnimationActive
                            animationDuration={700}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}

export default AnalyticsWidget
