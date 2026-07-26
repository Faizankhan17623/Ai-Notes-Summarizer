import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import {
    FaUsers, FaStickyNote, FaComments, FaBolt, FaExclamationTriangle,
    FaArrowRight, FaMoneyBillWave, FaClipboardList, FaBullhorn, FaHeartbeat,
} from 'react-icons/fa'
import { GetOverview } from '../../Services/operations/Admin.js'
import { fadeUp, staggerContainer } from '../extra/motionVariants.js'

// tiny inline trend shape sir — no axes/labels/tooltip, just a glance-value shape behind
// the number, same recharts AreaChart Analytics.jsx uses for the full-size charts, just
// stripped down to a sparkline
const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) return null
    return (
        <ResponsiveContainer width="100%" height={32}>
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    )
}

// icon-badge stat card sir — same fade-in-up + hover-lift language as Payments.jsx's
// StatCard, extended with an icon badge, an optional trend pill, and an optional sparkline
// so the card actually communicates direction, not just a bare number
const StatCard = ({ label, value, icon: Icon, tone = 'accent', trend, sparkline, delay = 0 }) => {
    const toneClasses = {
        accent: 'bg-yellow-50/10 text-yellow-50',
        danger: 'bg-danger-soft/10 text-danger-soft',
        good: 'bg-good/10 text-good',
    }
    return (
        <motion.div
            variants={fadeUp}
            style={{ '--delay': `${delay}ms` }}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="border border-border-soft bg-surface rounded-xl p-5 transition-colors duration-200 hover:border-yellow-50/40 hover:shadow-lg hover:shadow-black/20"
        >
            <div className="flex items-start justify-between mb-3">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
                    <Icon size={14} />
                </span>
                {trend != null && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${trend >= 0 ? 'text-good bg-good/10' : 'text-danger-soft bg-danger-soft/10'}`}>
                        {trend >= 0 ? '+' : ''}{trend} / 7d
                    </span>
                )}
            </div>
            <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1">{label}</p>
            <p className="font-mono text-2xl text-richblack-5">{value}</p>
            {sparkline && <div className="mt-2 -mx-1"><Sparkline data={sparkline} color="var(--color-yellow-50)" /></div>}
        </motion.div>
    )
}

// quick-jump shortcuts sir — the admin's most common next-clicks from Overview, so landing
// here isn't a dead end before diving into Users/Payments/Audit/Announcements
const SHORTCUTS = [
    { to: '/Admin/Users', label: 'Manage users', icon: FaUsers },
    { to: '/Admin/Payments', label: 'View payments', icon: FaMoneyBillWave },
    { to: '/Admin/Audit', label: 'Audit log', icon: FaClipboardList },
    { to: '/Admin/Announcements', label: 'Announcements', icon: FaBullhorn },
    { to: '/Admin/Health', label: 'System health', icon: FaHeartbeat },
]

const Overview = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { overview, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetOverview(token))
    }, [dispatch, token])

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Admin Overview — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-8 animate-fade-in-up">Overview</h1>

            {loading || !overview ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={staggerContainer(0.06)}
                        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
                    >
                        <StatCard
                            label="Total users"
                            value={overview.userCount}
                            icon={FaUsers}
                            trend={overview.newUsers7d}
                            sparkline={overview.signupsByDay}
                        />
                        <StatCard label="Total notes" value={overview.noteCount} icon={FaStickyNote} trend={overview.newNotes7d} />
                        <StatCard label="Total chats" value={overview.chatCount} icon={FaComments} />
                        <StatCard label="AI calls (24h)" value={overview.aiCallsLast24h} icon={FaBolt} />
                        <StatCard
                            label="AI failures (24h)"
                            value={overview.aiFailuresLast24h}
                            icon={FaExclamationTriangle}
                            tone={overview.aiFailuresLast24h > 0 ? 'danger' : 'good'}
                        />
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={fadeUp}
                            style={{ '--delay': '300ms' }}
                            className="border border-border-soft bg-surface rounded-xl p-6 animate-fade-in-up transition-colors duration-200 hover:border-yellow-50/30"
                        >
                            <h2 className="text-richblack-5 font-semibold mb-4">Plan breakdown</h2>
                            {overview.planBreakdown.length === 0 ? (
                                <p className="text-richblack-400 text-sm">No users yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {overview.planBreakdown.map((p, i) => {
                                        const pct = overview.userCount > 0 ? Math.round((p.count / overview.userCount) * 100) : 0
                                        return (
                                            <div key={p._id} style={{ '--delay': `${340 + i * 40}ms` }} className="animate-fade-in-up">
                                                <div className="flex justify-between items-center text-sm mb-1.5">
                                                    <span className="text-richblack-200">{p._id || 'Unknown'}</span>
                                                    <span className="font-mono text-richblack-5">{p.count}</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-border-soft overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 + i * 0.05 }}
                                                        className="h-full bg-yellow-50 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={fadeUp}
                            style={{ '--delay': '360ms' }}
                            className="border border-border-soft bg-surface rounded-xl p-6 animate-fade-in-up transition-colors duration-200 hover:border-yellow-50/30"
                        >
                            <h2 className="text-richblack-5 font-semibold mb-4">Quick jump</h2>
                            <div className="grid grid-cols-2 gap-2.5">
                                {SHORTCUTS.map(({ to, label, icon: Icon }) => (
                                    <Link
                                        key={to}
                                        to={to}
                                        className="group flex items-center gap-2.5 border border-border-soft rounded-lg px-3 py-2.5 text-sm text-richblack-200 hover:text-richblack-5 hover:border-yellow-50/40 hover:bg-surface-hover transition-colors duration-150"
                                    >
                                        <Icon size={13} className="text-yellow-50 shrink-0" />
                                        <span className="truncate">{label}</span>
                                        <FaArrowRight size={10} className="ml-auto shrink-0 opacity-0 group-hover:opacity-60 transition-opacity duration-150" />
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </div>
    )
}

export default Overview
