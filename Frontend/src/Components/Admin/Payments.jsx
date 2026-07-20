import { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaRupeeSign, FaCheckCircle, FaTimesCircle, FaReceipt, FaUndo } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetPayments, RefundPayment } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const STATUS_TONE = {
    paid: 'good',
    completed: 'good',
    failed: 'danger',
    pending: 'neutral',
    created: 'neutral',
    refunded: 'neutral',
}

// counts up from 0 to the target value on mount/change instead of just popping in sir —
// purely cosmetic, ~600ms, skipped for non-numeric values (e.g. the "₹" prefix is applied
// by the caller, this hook only ever animates the raw number)
const useCountUp = (target, durationMs = 600) => {
    const [value, setValue] = useState(0)
    const fromRef = useRef(0)

    useEffect(() => {
        const from = fromRef.current
        const to = Number(target) || 0
        if (from === to) return
        const start = performance.now()
        let frame
        const tick = (now) => {
            const progress = Math.min(1, (now - start) / durationMs)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(from + (to - from) * eased))
            if (progress < 1) frame = requestAnimationFrame(tick)
            else fromRef.current = to
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [target, durationMs])

    return value
}

const StatCard = ({ label, value, icon: Icon, tone, prefix = '', delay = 0 }) => {
    const animated = useCountUp(value)
    return (
        <div
            style={{ '--delay': `${delay}ms` }}
            className="group border border-border-soft bg-surface rounded-lg p-4 flex items-center gap-3 animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-50/40 hover:shadow-lg hover:shadow-black/20"
        >
            <span className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${tone === 'danger' ? 'bg-danger-soft/10 text-danger-soft' : 'bg-yellow-50/10 text-yellow-50'}`}>
                <Icon size={14} />
            </span>
            <div>
                <p className="text-xs uppercase tracking-wide text-richblack-400">{label}</p>
                <p className="font-mono text-xl text-richblack-5">{prefix}{animated}</p>
            </div>
        </div>
    )
}

const Payments = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { payments, loading } = useSelector((state) => state.admin)
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')
    // refunds are Admin-only sir — Support can see payments to help/verify, but the backend
    // 403s a refund attempt from Support too, so hide the button rather than let it just fail
    const isAdmin = user?.role === 'Admin'

    useEffect(() => {
        dispatch(GetPayments(token))
    }, [dispatch, token])

    const handleRefund = async (payment) => {
        const result = await Swal.fire({
            title: 'Refund this payment?',
            text: `${payment.creditsGranted} credits (₹${payment.amount}) will be removed from ${payment.user?.firstName || 'this user'}'s balance and the payment marked refunded.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Refund',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(RefundPayment(payment._id, token))
        }
    }

    const plans = useMemo(() => ['all', ...new Set(payments.map((p) => p.plan))], [payments])

    const filtered = useMemo(() => payments.filter((p) =>
        (statusFilter === 'all' || p.status === statusFilter) &&
        (planFilter === 'all' || p.plan === planFilter)
    ), [payments, statusFilter, planFilter])

    const stats = useMemo(() => {
        const paid = payments.filter((p) => p.status === 'paid' || p.status === 'completed')
        const failed = payments.filter((p) => p.status === 'failed')
        const refunded = payments.filter((p) => p.status === 'refunded')
        const totalRevenue = paid.reduce((sum, p) => sum + (p.amount || 0), 0)
        return { totalRevenue, paidCount: paid.length, failedCount: failed.length, refundedCount: refunded.length }
    }, [payments])

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Admin Payments — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6 animate-fade-in-up">Payments</h1>

            {payments.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Total revenue" value={stats.totalRevenue} icon={FaRupeeSign} prefix="₹" delay={0} />
                    <StatCard label="Successful payments" value={stats.paidCount} icon={FaCheckCircle} delay={60} />
                    <StatCard label="Failed payments" value={stats.failedCount} icon={FaTimesCircle} tone="danger" delay={120} />
                    <StatCard label="Refunded payments" value={stats.refundedCount} icon={FaUndo} delay={180} />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : payments.length === 0 ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8 animate-fade-in-up">
                    <FaReceipt className="text-richblack-600 text-3xl mx-auto mb-4" />
                    <p className="text-richblack-300 text-sm">No payments yet — checkout is currently in stub mode until Razorpay keys are added.</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up" style={{ '--delay': '220ms' }}>
                        <div className="flex gap-1.5">
                            {['all', 'paid', 'failed', 'created'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`text-sm rounded-md px-3 py-1.5 cursor-pointer transition-all duration-200 capitalize ${statusFilter === s ? "bg-yellow-50 text-richblack-900 scale-105" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50 hover:scale-105"}`}
                                >
                                    {s === 'all' ? 'All statuses' : s}
                                </button>
                            ))}
                        </div>
                        <select
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className="bg-surface-hover border border-border-soft text-richblack-200 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50 transition-colors duration-200"
                        >
                            {plans.map((p) => <option key={p} value={p}>{p === 'all' ? 'All plans' : p}</option>)}
                        </select>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8 animate-fade-in-up">
                            <p className="text-richblack-300 text-sm">No payments match this filter.</p>
                        </div>
                    ) : (
                        <div className="border border-border-soft bg-surface rounded-lg overflow-hidden animate-fade-in-up" style={{ '--delay': '260ms' }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-richblack-400 border-b border-border-soft">
                                            <th className="py-3 px-4 font-medium">User</th>
                                            <th className="py-3 px-4 font-medium">Plan</th>
                                            <th className="py-3 px-4 font-medium">Amount</th>
                                            <th className="py-3 px-4 font-medium">Status</th>
                                            <th className="py-3 px-4 font-medium">Order / Payment ID</th>
                                            <th className="py-3 px-4 font-medium">Date</th>
                                            {isAdmin && <th className="py-3 px-4 font-medium">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((p, i) => (
                                            <tr
                                                key={p._id}
                                                style={{ '--delay': `${Math.min(i, 12) * 30}ms` }}
                                                className="border-b border-border-soft last:border-b-0 text-richblack-200 hover:bg-surface-hover transition-colors animate-fade-in-up"
                                            >
                                                <td className="py-3 px-4 text-richblack-5">{p.user?.firstName} {p.user?.lastName}</td>
                                                <td className="py-3 px-4">{p.plan}</td>
                                                <td className="py-3 px-4 font-mono">₹{p.amount}</td>
                                                <td className="py-3 px-4">
                                                    <StatusBadge tone={STATUS_TONE[p.status] || 'neutral'}>{p.status}</StatusBadge>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-xs text-richblack-300">
                                                    <p className="truncate max-w-[160px]" title={p.razorpayOrderId}>{p.razorpayOrderId || '—'}</p>
                                                    {p.razorpayPaymentId && (
                                                        <p className="truncate max-w-[160px] text-richblack-400" title={p.razorpayPaymentId}>{p.razorpayPaymentId}</p>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-richblack-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                {isAdmin && (
                                                    <td className="py-3 px-4">
                                                        {p.plan === 'CreditPack' && p.status === 'paid' && (
                                                            <button onClick={() => handleRefund(p)} className="text-danger-soft text-xs font-medium cursor-pointer hover:underline">
                                                                Refund
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default Payments
