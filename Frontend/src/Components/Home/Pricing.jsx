import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { GetPlans, CreateOrder } from '../../Services/operations/Payment.js'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'

const Pricing = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { plans, paymentsLive, loading } = useSelector((state) => state.payment)
    const { token, user } = useSelector((state) => state.auth)

    useEffect(() => {
        dispatch(GetPlans())
    }, [dispatch])

    const handleUpgrade = async (planKey) => {
        if (!token) {
            navigate('/Signup')
            return
        }
        if (planKey === 'Basic') return
        await dispatch(CreateOrder(planKey, token))
    }

    if (loading) return <Loading text="Loading plans..." />

    return (
        <div className="min-h-screen bg-richblack-900 px-6 py-16">
            <Helmet><title>Pricing — AI Notes Summarizer</title></Helmet>
            <h1 className="text-3xl font-bold text-richblack-5 text-center mb-4">Choose your plan</h1>
            <p className="text-richblack-300 text-center mb-12">
                {paymentsLive ? "Upgrade anytime — cancel whenever you like." : "Upgrades are coming soon — full plan gating is already live under the hood."}
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.map((plan) => (
                    <div key={plan.key} className={`border rounded-lg p-6 flex flex-col ${plan.key === user?.SubType ? 'border-yellow-50' : 'border-richblack-700'}`}>
                        <h2 className="text-xl font-bold text-richblack-5 mb-2">{plan.name}</h2>
                        <p className="text-3xl font-bold text-yellow-50 mb-4">
                            {plan.priceInr ? `₹${plan.priceInr}/mo` : "Free"}
                        </p>
                        <ul className="text-richblack-200 text-sm space-y-2 mb-6 flex-1">
                            <li>{plan.credits === null ? "Unlimited" : plan.credits} summaries / month</li>
                            <li>{plan.maxMessagesPerChat === null ? "Unlimited" : plan.maxMessagesPerChat} messages per chat</li>
                            <li>{plan.key === 'Basic' ? "Key points + action items" : plan.key === 'Pro' ? "+ Sections & key terms" : "+ Quiz & flashcards"}</li>
                        </ul>
                        <IconBtn
                            text={plan.key === user?.SubType ? "Current plan" : plan.key === 'Basic' ? "Included free" : "Upgrade"}
                            disabled={plan.key === user?.SubType || plan.key === 'Basic'}
                            onclick={() => handleUpgrade(plan.key)}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Pricing
