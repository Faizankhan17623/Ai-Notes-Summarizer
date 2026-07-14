import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetPayments } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const STATUS_TONE = {
    paid: 'good',
    completed: 'good',
    failed: 'danger',
    pending: 'neutral',
}

const Payments = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { payments, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetPayments(token))
    }, [dispatch, token])

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Admin Payments — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Payments</h1>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : payments.length === 0 ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                    <p className="text-richblack-300 text-sm">No payments yet — checkout is currently in stub mode until Razorpay keys are added.</p>
                </div>
            ) : (
                <div className="border border-border-soft bg-surface rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-border-soft">
                                    <th className="py-3 px-4 font-medium">User</th>
                                    <th className="py-3 px-4 font-medium">Plan</th>
                                    <th className="py-3 px-4 font-medium">Amount</th>
                                    <th className="py-3 px-4 font-medium">Status</th>
                                    <th className="py-3 px-4 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p._id} className="border-b border-border-soft last:border-b-0 text-richblack-200 hover:bg-surface-hover transition-colors">
                                        <td className="py-3 px-4 text-richblack-5">{p.user?.firstName} {p.user?.lastName}</td>
                                        <td className="py-3 px-4">{p.plan}</td>
                                        <td className="py-3 px-4 font-mono">₹{p.amount}</td>
                                        <td className="py-3 px-4">
                                            <StatusBadge tone={STATUS_TONE[p.status] || 'neutral'}>{p.status}</StatusBadge>
                                        </td>
                                        <td className="py-3 px-4 text-richblack-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Payments
