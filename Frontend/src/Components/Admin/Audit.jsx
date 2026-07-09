import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetAuditLog, GetAiLogs } from '../../Services/operations/Admin.js'
import Navbar from '../Home/Navbar.jsx'
import AdminNav from './AdminNav.jsx'
import Loading from '../extra/Loading.jsx'

const Audit = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { auditLogs, aiLogs, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetAuditLog(token))
        dispatch(GetAiLogs(token))
    }, [dispatch, token])

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Admin Audit — AI Notes Summarizer</title></Helmet>
            <Navbar />
            <AdminNav />

            <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
                <div>
                    <h1 className="text-2xl font-bold text-richblack-5 mb-6">Admin actions</h1>
                    {loading ? <Loading text="Loading..." /> : (
                        <div className="space-y-2">
                            {auditLogs.map((log) => (
                                <div key={log._id} className="border border-richblack-800 rounded-md p-3 text-sm text-richblack-200">
                                    <span className="text-yellow-50">{log.actor?.firstName} {log.actor?.lastName}</span> {log.action.replaceAll('_', ' ')} {log.details ? `— ${log.details}` : ''}
                                    <span className="text-richblack-500 float-right">{new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                            ))}
                            {auditLogs.length === 0 && <p className="text-richblack-400 text-sm">No admin actions yet.</p>}
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-bold text-richblack-5 mb-6">AI usage / cost monitor</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-richblack-700">
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Plan</th>
                                    <th className="py-2 pr-4">Model</th>
                                    <th className="py-2 pr-4">Tokens</th>
                                    <th className="py-2 pr-4">Latency</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aiLogs.map((log) => (
                                    <tr key={log._id} className="border-b border-richblack-800 text-richblack-200">
                                        <td className="py-2 pr-4">{log.type}</td>
                                        <td className="py-2 pr-4">{log.plan}</td>
                                        <td className="py-2 pr-4">{log.model}</td>
                                        <td className="py-2 pr-4">{log.totalTokens}</td>
                                        <td className="py-2 pr-4">{log.latencyMs}ms</td>
                                        <td className="py-2 pr-4">{log.success ? <span className="text-caribbeangreen-300">OK</span> : <span className="text-pink-200">Failed</span>}</td>
                                        <td className="py-2 pr-4">{new Date(log.createdAt).toLocaleString()}</td>
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
