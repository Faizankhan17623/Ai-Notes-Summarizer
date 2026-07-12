import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { GetMyAnalytics } from '../../Services/operations/Analytics.js'

const StatBox = ({ label, value }) => (
    <div className="border border-border-soft bg-surface-hover rounded-md p-3 text-center">
        <p className="font-mono text-yellow-50 font-bold text-lg">{value}</p>
        <p className="text-richblack-400 text-xs mt-0.5">{label}</p>
    </div>
)

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
                <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData}>
                            <XAxis dataKey="date" stroke="var(--color-richblack-500)" fontSize={11} />
                            <YAxis allowDecimals={false} stroke="var(--color-richblack-500)" fontSize={11} width={24} />
                            <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-soft)', color: 'var(--color-richblack-5)' }} />
                            <Area type="monotone" dataKey="count" stroke="var(--color-yellow-50)" fill="var(--color-yellow-50)" fillOpacity={0.15} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

export default AnalyticsWidget
