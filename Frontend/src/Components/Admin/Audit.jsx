import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaDownload, FaChevronLeft, FaChevronRight, FaSearch } from 'react-icons/fa'
import { GetAuditLog, GetAiLogs } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'
import SavedViewsBar from './SavedViewsBar.jsx'
import { toCsv, downloadCsv } from '../../utils/csv.js'

const AUDIT_CSV_COLUMNS = [
    { label: 'Actor', get: (l) => `${l.actor?.firstName || ''} ${l.actor?.lastName || ''}`.trim() },
    { label: 'Action', key: 'action' },
    { label: 'Target', get: (l) => l.target ? `${l.target.firstName || ''} ${l.target.lastName || ''}`.trim() : '' },
    { label: 'Target email', key: 'target.email' },
    { label: 'Details', key: 'details' },
    { label: 'Date', get: (l) => l.createdAt ? new Date(l.createdAt).toISOString() : '' },
]

const AI_LOGS_CSV_COLUMNS = [
    { label: 'User', get: (l) => l.user ? `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() : 'Deleted user' },
    { label: 'Type', key: 'type' },
    { label: 'Plan', key: 'plan' },
    { label: 'Model', key: 'model' },
    { label: 'Total tokens', key: 'totalTokens' },
    { label: 'Latency (ms)', key: 'latencyMs' },
    { label: 'Success', get: (l) => l.success ? 'yes' : 'no' },
    { label: 'Date', get: (l) => l.createdAt ? new Date(l.createdAt).toISOString() : '' },
]

const ExportButton = ({ onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 border border-border-soft text-richblack-200 hover:border-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
        <FaDownload size={11} /> Export CSV
    </button>
)

// same Prev/Next shape as the Users table's pagination sir, factored out since Audit now
// has two independently-paginated tables on one page
const Pagination = ({ page, pages, total, onPrev, onNext }) => (
    pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-soft">
            <p className="text-richblack-400 text-xs">Page {page} of {pages} · {total} total</p>
            <div className="flex gap-2">
                <button
                    onClick={onPrev}
                    disabled={page <= 1}
                    className="flex items-center gap-1 text-xs rounded-md px-3 py-1.5 border border-border-soft text-richblack-200 hover:border-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                    <FaChevronLeft size={10} /> Prev
                </button>
                <button
                    onClick={onNext}
                    disabled={page >= pages}
                    className="flex items-center gap-1 text-xs rounded-md px-3 py-1.5 border border-border-soft text-richblack-200 hover:border-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                    Next <FaChevronRight size={10} />
                </button>
            </div>
        </div>
    )
)

const Audit = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const {
        auditLogs, auditLogsTotal, auditLogsPage, auditLogsPages,
        aiLogs, aiLogsTotal, aiLogsPage, aiLogsPages,
        loading,
    } = useSelector((state) => state.admin)
    // paginated independently sir — one table's Next shouldn't page the other
    const [auditPage, setAuditPage] = useState(1)
    const [aiPage, setAiPage] = useState(1)
    const [aiUserSearch, setAiUserSearch] = useState('')
    const [aiModel, setAiModel] = useState('')
    const [aiSuccess, setAiSuccess] = useState('all')

    useEffect(() => {
        dispatch(GetAuditLog(token, auditPage))
    }, [dispatch, token, auditPage])

    // debounced sir — same 300ms pattern as History.jsx's note search, avoids firing on
    // every keystroke against the userSearch filter
    useEffect(() => {
        const handle = setTimeout(() => {
            const filters = {}
            if (aiUserSearch.trim()) filters.userSearch = aiUserSearch.trim()
            if (aiModel) filters.model = aiModel
            if (aiSuccess !== 'all') filters.success = aiSuccess
            dispatch(GetAiLogs(token, aiPage, filters))
        }, 300)
        return () => clearTimeout(handle)
    }, [dispatch, token, aiPage, aiUserSearch, aiModel, aiSuccess])

    // model options come from whatever's currently loaded sir — AiLog.model is free-text,
    // no fixed enum server-side to draw a dropdown from, same "derive from visible data"
    // approach Payments.jsx already uses for its plan filter
    const aiModelOptions = useMemo(() => [...new Set(aiLogs.map((l) => l.model).filter(Boolean))], [aiLogs])

    return (
        <div className="px-6 md:px-10 py-10 space-y-10">
            <Helmet><title>Admin Audit — Notewise</title></Helmet>

            <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                    <h1 className="font-display text-3xl font-semibold text-richblack-5">Admin actions</h1>
                    <ExportButton
                        onClick={() => downloadCsv(`admin-actions-${Date.now()}.csv`, toCsv(auditLogs, AUDIT_CSV_COLUMNS))}
                        disabled={auditLogs.length === 0}
                    />
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-14">
                        <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : auditLogs.length === 0 ? (
                    <div className="border border-border-soft bg-surface rounded-lg text-center py-12 px-8">
                        <p className="text-richblack-400 text-sm">No admin actions yet.</p>
                    </div>
                ) : (
                    <div className="border border-border-soft bg-surface rounded-lg overflow-hidden">
                        <div className="divide-y divide-border-soft">
                            {auditLogs.map((log) => (
                                <div key={log._id} className="p-4 text-sm text-richblack-200 flex items-center justify-between gap-4">
                                    <p>
                                        <span className="text-yellow-50 font-medium">{log.actor?.firstName} {log.actor?.lastName}</span>{' '}
                                        {log.action.replaceAll('_', ' ')}
                                        {log.target && (
                                            <> <span className="text-richblack-5 font-medium">{log.target.firstName} {log.target.lastName}</span> <span className="text-richblack-500">({log.target.email})</span></>
                                        )}
                                        {log.details ? ` — ${log.details}` : ''}
                                    </p>
                                    <span className="text-richblack-500 text-xs shrink-0 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <Pagination
                            page={auditLogsPage}
                            pages={auditLogsPages}
                            total={auditLogsTotal}
                            onPrev={() => setAuditPage((p) => Math.max(1, p - 1))}
                            onNext={() => setAuditPage((p) => Math.min(auditLogsPages, p + 1))}
                        />
                    </div>
                )}
            </div>

            <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="font-display text-xl font-semibold text-richblack-5">AI usage / cost monitor</h2>
                    <ExportButton
                        onClick={() => downloadCsv(`ai-usage-${Date.now()}.csv`, toCsv(aiLogs, AI_LOGS_CSV_COLUMNS))}
                        disabled={aiLogs.length === 0}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-500" size={12} />
                        <input
                            value={aiUserSearch}
                            onChange={(e) => { setAiUserSearch(e.target.value); setAiPage(1) }}
                            placeholder="Search by user name or email..."
                            className="w-full bg-surface border border-border-soft text-richblack-5 text-sm rounded-md pl-8 pr-3 py-1.5 outline-none focus:border-yellow-50 transition-colors"
                        />
                    </div>
                    <select
                        value={aiModel}
                        onChange={(e) => { setAiModel(e.target.value); setAiPage(1) }}
                        className="bg-surface-hover border border-border-soft text-richblack-200 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50"
                    >
                        <option value="">All models</option>
                        {aiModelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="flex gap-1.5">
                        {['all', 'true', 'false'].map((s) => (
                            <button
                                key={s}
                                onClick={() => { setAiSuccess(s); setAiPage(1) }}
                                className={`text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors ${aiSuccess === s ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                            >
                                {s === 'all' ? 'All' : s === 'true' ? 'OK' : 'Failed'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <SavedViewsBar
                        page="ai-logs"
                        filters={{ aiUserSearch, aiModel, aiSuccess }}
                        onApply={(f) => {
                            setAiUserSearch(f.aiUserSearch || '')
                            setAiModel(f.aiModel || '')
                            setAiSuccess(f.aiSuccess || 'all')
                            setAiPage(1)
                        }}
                    />
                </div>

                <div className="border border-border-soft bg-surface rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-border-soft">
                                    <th className="py-3 px-4 font-medium">User</th>
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
                                        <td className="py-3 px-4 text-xs">
                                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : <span className="text-richblack-500">Deleted user</span>}
                                        </td>
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
                    <Pagination
                        page={aiLogsPage}
                        pages={aiLogsPages}
                        total={aiLogsTotal}
                        onPrev={() => setAiPage((p) => Math.max(1, p - 1))}
                        onNext={() => setAiPage((p) => Math.min(aiLogsPages, p + 1))}
                    />
                </div>
            </div>
        </div>
    )
}

export default Audit
