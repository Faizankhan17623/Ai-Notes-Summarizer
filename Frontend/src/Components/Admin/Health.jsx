import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaDatabase, FaBolt, FaEnvelope, FaTachometerAlt, FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa'
import { GetHealth } from '../../Services/operations/Admin.js'
import { fadeUp, staggerContainer } from '../extra/motionVariants.js'
import StatusBadge from './StatusBadge.jsx'

// Expected GET /admin/health response shape sir (see Backend/index.js's bare /health for the
// current stand-in — this is what /admin/health should return once built):
//
// {
//   success: true,
//   health: {
//     status: 'healthy' | 'degraded' | 'down',          // overall rollup
//     uptime: number,                                     // seconds, process.uptime()
//     checkedAt: string,                                  // ISO timestamp, for the cache note below
//     db: {
//       ok: boolean,
//       poolSize: number,        // total pool size configured (mongoose maxPoolSize)
//       available: number,       // idle/available connections right now
//       inUse: number,
//     },
//     ai: { ok: boolean, latencyMs: number | null },       // Groq ping
//     mail: { ok: boolean, latencyMs: number | null },     // Vercel mail-relay reachability ping, no real email sent
//     eventLoop: { meanMs: number, maxMs: number },
//     env: { ok: boolean, missing: string[] },             // e.g. ['MONGO_DB_URL', 'GROQ_API_KEY', 'JWT_PRIVATE_KEY']
//     cachedForSeconds: number,                            // ~30s server-side cache window
//   }
// }
//
// Rendered defensively below — every field is optional-chained since the backend for this
// doesn't exist yet (see the conversation this was built in); once it's live this comment can
// be trimmed but the optional chaining is harmless to leave.

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
                        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
                    >
                        <CheckCard
                            icon={FaDatabase}
                            label="Database"
                            ok={health.db?.ok}
                            delay={0}
                            detail={health.db ? `${health.db.inUse ?? '—'} in use / ${health.db.available ?? '—'} available (pool ${health.db.poolSize ?? '—'})` : '—'}
                        />
                        <CheckCard
                            icon={FaBolt}
                            label="Groq AI"
                            ok={health.ai?.ok}
                            delay={60}
                            detail={health.ai?.ok ? `${health.ai.latencyMs ?? '—'} ms` : 'Unreachable'}
                        />
                        <CheckCard
                            icon={FaEnvelope}
                            label="Mail relay"
                            ok={health.mail?.ok}
                            delay={120}
                            detail={health.mail?.ok ? `${health.mail.latencyMs ?? '—'} ms` : 'Unreachable'}
                        />
                        <CheckCard
                            icon={FaTachometerAlt}
                            label="Event-loop lag"
                            ok={health.eventLoop ? health.eventLoop.maxMs < 100 : undefined}
                            delay={180}
                            detail={health.eventLoop ? `mean ${health.eventLoop.meanMs?.toFixed?.(1) ?? health.eventLoop.meanMs} ms · max ${health.eventLoop.maxMs} ms` : '—'}
                        />
                    </motion.div>

                    <p className="text-richblack-500 text-xs">
                        {health.checkedAt && `Checked ${new Date(health.checkedAt).toLocaleString()}`}
                        {health.cachedForSeconds != null && ` · cached for up to ${health.cachedForSeconds}s`}
                        {health.uptime != null && ` · process uptime ${Math.floor(health.uptime / 60)}m`}
                    </p>
                </>
            )}
        </div>
    )
}

export default Health
