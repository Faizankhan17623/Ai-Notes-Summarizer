import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAuditLog, GetAiLogs } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const Audit = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { auditLogs, aiLogs, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetAuditLog(token))
        dispatch(GetAiLogs(token))
    }, [dispatch, token])

    return (
        <div className="px-6 md:px-10 py-10 space-y-10">
            <Helmet><title>Admin Audit — AI Notes Summarizer</title></Helmet>

            <div>
                <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Admin actions</h1>
                {loading ? (
                    <div className="flex items-center justify-center py-14">
                        <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : auditLogs.length === 0 ? (
                    <div className="border border-border-soft bg-surface rounded-lg text-center py-12 px-8">
                        <p className="text-richblack-400 text-sm">No admin actions yet.</p>
                    </div>
                ) : (
                    <div className="border border-border-soft bg-surface rounded-lg divide-y divide-border-soft">
                        {auditLogs.map((log) => (
                            <div key={log._id} className="p-4 text-sm text-richblack-200 flex items-center justify-between gap-4">
                                <p>
                                    <span className="text-yellow-50 font-medium">{log.actor?.firstName} {log.actor?.lastName}</span>{' '}
                                    {log.action.replaceAll('_', ' ')} {log.details ? `— ${log.details}` : ''}
                                </p>
                                <span className="text-richblack-500 text-xs shrink-0 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="font-display text-xl font-semibold text-richblack-5 mb-6">AI usage / cost monitor</h2>
                <div className="border border-border-soft bg-surface rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-border-soft">
                                    <th className="py-3 px-4 font-medium">Type</th>
                                    <th className="py-3 px-4 font-medium">Plan</th>
                                    <th className="py-3 px-4 font-medium">Model</th>
                                    <th className="py-3 px-4 font-medium">Tokens</th>
                                    <th className="py-3 px-4 font-medium">Latency</th>
                                    <th className="py-3 px-4 font-medium">Status</th>
                                    <th className="py-3 px-4 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aiLogs.map((log) => (
                                    <tr key={log._id} className="border-b border-border-soft last:border-b-0 text-richblack-200 hover:bg-surface-hover transition-colors">
                                        <td className="py-3 px-4">{log.type}</td>
                                        <td className="py-3 px-4">{log.plan}</td>
                                        <td className="py-3 px-4 text-richblack-400 text-xs">{log.model}</td>
                                        <td className="py-3 px-4 font-mono">{log.totalTokens}</td>
                                        <td className="py-3 px-4 font-mono">{log.latencyMs}ms</td>
                                        <td className="py-3 px-4">
                                            {log.success ? <StatusBadge tone="good">OK</StatusBadge> : <StatusBadge tone="danger">Failed</StatusBadge>}
                                        </td>
                                        <td className="py-3 px-4 text-richblack-400">{new Date(log.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Audit
