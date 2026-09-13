import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaDatabase, FaBolt, FaEnvelope, FaClock, FaExclamationTriangle, FaSyncAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { GetHealth } from '../../Services/operations/Admin.js'
import { fadeUp, staggerContainer } from '../extra/motionVariants.js'
import StatusBadge from './StatusBadge.jsx'

// GET /admin/health response shape sir (see Backend/controllers/Admin.js's getHealth):
//
// {
//   success: true,
//   health: {
//     status: 'healthy' | 'degraded' | 'down',    // down: DB unreachable or required env var missing.
//                                                    degraded: DB/env fine but the last run of a
//                                                    scheduled cron job failed
//     uptime: number,                               // seconds, process.uptime() of THIS web process —
//                                                    the cron jobs run as separate GitHub Actions
//                                                    processes, so this doesn't cover them; see `jobs` below
//     checkedAt: string,                            // ISO timestamp
//     db: { ok: boolean },
//     ai: { ok: boolean },                          // GROQ_API_KEY is configured, not a live ping
//     mail: { ok: boolean },                        // mail relay or direct SMTP is configured, not a live send
//     env: { ok: boolean, missing: string[] },      // e.g. ['MONGO_DB_URL', 'GROQ_API_KEY']
//     jobs: {                                       // last GitHub Actions run of each scheduled job
//       'weekly-digest': { result: 'ran'|'failed', finishedAt: string, error: string|null } | null,
//       'plan-expiry-warnings': { result: 'ran'|'failed', finishedAt: string, error: string|null } | null,
//     }
//   }
// }
//
// Rendered defensively below — every field is optional-chained.

const STATUS_TONE = { healthy: 'good', degraded: 'danger', down: 'danger' }
const STATUS_LABEL = { healthy: 'Healthy', degraded: 'Degraded', down: 'Down' }

const CheckCard = ({ icon: Icon, label, ok, detail, delay = 0 }) => (
    <motion.div
        variants={fadeUp}
        style={{ '--delay': `${delay}ms` }}
        className="border border-border-soft bg-surface rounded-xl p-5"
    >
        <div className="flex items-start justify-between mb-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ok === false ? 'bg-danger-soft/10 text-danger-soft' : 'bg-yellow-50/10 text-yellow-50'}`}>
                <Icon size={14} />
            </span>
            <span className={`w-2 h-2 rounded-full mt-1 ${ok === false ? 'bg-danger-soft' : ok === true ? 'bg-good' : 'bg-richblack-600'}`} title={ok === false ? 'Failing' : ok === true ? 'OK' : 'Unknown'} />
        </div>
        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1">{label}</p>
        <p className="text-richblack-5 text-sm">{detail}</p>
    </motion.div>
)

const Health = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { health, healthLoading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetHealth(token))
    }, [dispatch, token])

    const missing = health?.env?.missing || []

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>System Health — Notewise</title></Helmet>

            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="font-display text-3xl font-semibold text-richblack-5">System health</h1>
                    {health?.status && (
                        <StatusBadge tone={STATUS_TONE[health.status] || 'neutral'}>{STATUS_LABEL[health.status] || health.status}</StatusBadge>
                    )}
                </div>
                <button
                    onClick={() => dispatch(GetHealth(token))}
                    disabled={healthLoading}
                    className="flex items-center gap-2 text-sm text-richblack-300 border border-border-soft rounded-md px-3 py-1.5 cursor-pointer hover:border-yellow-50 hover:text-richblack-5 transition-colors disabled:opacity-50"
                >
                    <FaSyncAlt size={11} className={healthLoading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {healthLoading && !health ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : !health ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                    <FaExclamationTriangle className="text-richblack-600 text-3xl mx-auto mb-4" />
                    <p className="text-richblack-300 text-sm">
                        Couldn't load health data — /admin/health may not be implemented on the backend yet.
                    </p>
                </div>
            ) : (
                <>
                    {missing.length > 0 && (
                        <div className="flex items-start gap-2.5 border border-danger-soft/40 bg-danger-soft/10 rounded-lg px-4 py-3 mb-6">
                            <FaExclamationTriangle className="text-danger-soft mt-0.5 shrink-0" size={14} />
                            <p className="text-danger-soft text-sm">
                                Missing critical env vars: <span className="font-mono">{missing.join(', ')}</span>
                            </p>
                        </div>
                    )}

                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={staggerContainer(0.06)}
                        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
                    >
                        <CheckCard
                            icon={FaDatabase}
                            label="Database"
                            ok={health.db?.ok}
                            delay={0}
                            detail={health.db?.ok ? 'Connected' : 'Unreachable'}
                        />
                        <CheckCard
                            icon={FaBolt}
                            label="Groq AI"
                            ok={health.ai?.ok}
                            delay={60}
                            detail={health.ai?.ok ? 'Configured' : 'Not configured'}
                        />
                        <CheckCard
                            icon={FaEnvelope}
                            label="Mail"
                            ok={health.mail?.ok}
                            delay={120}
                            detail={health.mail?.ok ? 'Configured' : 'Not configured'}
                        />
                    </motion.div>

                    <p className="font-display text-lg font-semibold text-richblack-5 mb-4">Scheduled jobs</p>
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={staggerContainer(0.06)}
                        className="grid sm:grid-cols-2 gap-4 mb-6"
                    >
                        {Object.entries(health.jobs || {}).map(([jobName, run], i) => (
                            <motion.div
                                key={jobName}
                                variants={fadeUp}
                                style={{ '--delay': `${i * 60}ms` }}
                                className="border border-border-soft bg-surface rounded-xl p-5"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${run?.result === 'failed' ? 'bg-danger-soft/10 text-danger-soft' : 'bg-yellow-50/10 text-yellow-50'}`}>
                                        <FaClock size={14} />
                                    </span>
                                    {run?.result === 'failed' ? (
                                        <FaTimesCircle className="text-danger-soft mt-1" size={14} title="Last run failed" />
                                    ) : run?.result === 'ran' ? (
                                        <FaCheckCircle className="text-good mt-1" size={14} title="Last run succeeded" />
                                    ) : (
                                        <span className="w-2 h-2 rounded-full mt-1 bg-richblack-600" title="No runs recorded yet" />
                                    )}
                                </div>
                                <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1">{jobName}</p>
                                {run ? (
                                    <>
                                        <p className="text-richblack-5 text-sm">
                                            {run.result === 'failed' ? 'Failed' : 'Succeeded'} · {new Date(run.finishedAt).toLocaleString()}
                                        </p>
                                        {run.error && <p className="text-danger-soft text-xs mt-1 break-words">{run.error}</p>}
                                    </>
                                ) : (
                                    <p className="text-richblack-300 text-sm">No runs recorded yet</p>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>

                    <p className="text-richblack-500 text-xs">
                        {health.checkedAt && `Checked ${new Date(health.checkedAt).toLocaleString()}`}
                        {health.uptime != null && ` · web process uptime ${Math.floor(health.uptime / 60)}m`}
                    </p>
                </>
            )}
        </div>
    )
}

export default Health
