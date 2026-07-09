import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { GetMyAnalytics } from '../../Services/operations/Analytics.js'

const StatBox = ({ label, value }) => (
    <div className="bg-richblack-800 rounded-md p-3 text-center">
        <p className="text-yellow-50 font-bold text-lg">{value}</p>
        <p className="text-richblack-400 text-xs">{label}</p>
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
        <div className="border border-richblack-700 rounded-lg p-6 mb-10">
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
                            <XAxis dataKey="date" stroke="#585D69" fontSize={11} />
                            <YAxis allowDecimals={false} stroke="#585D69" fontSize={11} width={24} />
                            <Tooltip contentStyle={{ background: '#161D29', border: '1px solid #2C333F', color: '#F1F2FF' }} />
                            <Area type="monotone" dataKey="count" stroke="#FFD60A" fill="#FFD60A" fillOpacity={0.15} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

export default AnalyticsWidget
