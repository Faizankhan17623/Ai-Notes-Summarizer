import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { GetPayments } from '../../Services/operations/Admin.js'
import Navbar from '../Home/Navbar.jsx'
import AdminNav from './AdminNav.jsx'
import Loading from '../extra/Loading.jsx'

const Payments = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { payments, loading } = useSelector((state) => state.admin)

    useEffect(() => {
        dispatch(GetPayments(token))
    }, [dispatch, token])

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Admin Payments — AI Notes Summarizer</title></Helmet>
            <Navbar />
            <AdminNav />

            <div className="max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Payments</h1>

                {loading ? (
                    <Loading text="Loading payments..." />
                ) : payments.length === 0 ? (
                    <p className="text-richblack-400 text-sm">No payments yet — checkout is currently in stub mode until Razorpay keys are added.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-richblack-700">
                                    <th className="py-2 pr-4">User</th>
                                    <th className="py-2 pr-4">Plan</th>
                                    <th className="py-2 pr-4">Amount</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p._id} className="border-b border-richblack-800 text-richblack-200">
                                        <td className="py-2 pr-4">{p.user?.firstName} {p.user?.lastName}</td>
                                        <td className="py-2 pr-4">{p.plan}</td>
                                        <td className="py-2 pr-4">₹{p.amount}</td>
                                        <td className="py-2 pr-4">{p.status}</td>
                                        <td className="py-2 pr-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Payments
