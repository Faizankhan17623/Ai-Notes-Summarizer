import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaCheck, FaMinus, FaBolt } from 'react-icons/fa'
import { GetPlans, StartCheckout } from '../../Services/operations/Payment.js'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'
import MarketingLayout from './MarketingLayout.jsx'
import { fadeUp, viewportFadeUp, staggerContainer } from '../extra/motionVariants.js'

// mirrors Backend/utils/Plans.js (PLANS + featureLimits) and Prompts.js sir — every row
// here reflects a real gate in the code, not aspirational copy. Update this alongside those files.
const COMPARISON_ROWS = [
    { section: 'Summarizing' },
    { label: 'Text, document & article summaries', basic: true, pro: true, proMax: true },
    { label: 'Audio summaries', basic: true, pro: true, proMax: true },
    { label: 'TL;DR + key points', basic: true, pro: true, proMax: true },
    { label: 'Action items', basic: true, pro: true, proMax: true },
    { label: 'AI-suggested tags', basic: true, pro: true, proMax: true },
    { label: 'Sections & key terms breakdown', basic: false, pro: true, proMax: true },
    { section: 'Study tools' },
    { label: 'Quiz generated with every summary', basic: false, pro: false, proMax: true },
    { label: 'Flashcards generated with every summary', basic: false, pro: false, proMax: true },
    { label: 'Spaced-repetition review queue', basic: true, pro: true, proMax: true },
    { section: 'Chat with your notes' },
    { label: 'Messages per chat', basic: '60', pro: '200', proMax: '500' },
    { label: 'Chat context window (past turns remembered)', basic: '10', pro: '20', proMax: '40' },
    { label: 'On-request quizzes & flashcards in chat', basic: false, pro: true, proMax: true },
    { label: 'Mock quiz/exam sessions in chat', basic: false, pro: false, proMax: true },
    { label: 'Multi-day study plans in chat', basic: false, pro: false, proMax: true },
    { section: 'Usage' },
    { label: 'Summaries per month', basic: '5', pro: '100', proMax: '500' },
    { label: 'Document summaries per month', basic: '10', pro: '80', proMax: '150' },
    { label: 'Bulk file uploads per month', basic: '10', pro: '80', proMax: '150' },
    { label: 'Audio summaries per month', basic: '10', pro: '80', proMax: '150' },
    { label: 'Extra credit top-up packs', basic: true, pro: true, proMax: true },
    { section: 'AI model' },
    // mirrors Backend/utils/Plans.js MODEL_CATALOG sir — Basic has no choice (empty list there),
    // update the counts here if the catalog's model list per tier changes
    { label: 'Choice of AI model', basic: false, pro: true, proMax: true },
    { label: 'Models to choose from', basic: 'GPT-OSS 20B (fixed)', pro: 'GPT-OSS 20B & 120B', proMax: 'GPT-OSS 20B & 120B, Qwen 3.6 27B' },
]

const Cell = ({ value }) => {
    if (value === true) return <FaCheck className="text-good mx-auto" size={14} />
    if (value === false) return <FaMinus className="text-richblack-500 mx-auto" size={12} />
    return <span className="text-richblack-5 text-sm font-medium">{value}</span>
}

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
        dispatch(StartCheckout(planKey, token, user, navigate))
    }

    if (loading) return <Loading text="Loading plans..." />

    return (
        <MarketingLayout>
            <div className="px-6 py-16">
                <Helmet><title>Pricing — Notewise</title></Helmet>
                <motion.div initial="hidden" animate="show" variants={fadeUp}>
                    <div className="flex justify-center mb-4">
                        <span className="inline-flex items-center gap-1.5 bg-yellow-50/10 text-yellow-50 text-xs font-semibold px-3 py-1 rounded-full">
                            <FaBolt size={10} /> Simple, transparent pricing
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-richblack-5 text-center mb-4">Choose your plan</h1>
                    <p className="text-richblack-300 text-center mb-12">
                        {paymentsLive ? "Upgrade anytime — cancel whenever you like." : "Upgrades are coming soon — full plan gating is already live under the hood."}
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={staggerContainer(0.12, 0.1)}
                    className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
                >
                    {plans.map((plan) => {
                        // Pro is the recommended tier sir — best value between the free Basic
                        // plan and the highest-allowance-but-priciest ProMax, so it gets the highlight
                        // border + badge regardless of what the viewer is currently on
                        const isRecommended = plan.key === 'Pro'
                        return (
                            <motion.div
                                key={plan.key}
                                variants={fadeUp}
                                whileHover={{ y: -6 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                className={`relative border bg-surface rounded-lg p-6 flex flex-col overflow-hidden ${isRecommended ? 'border-yellow-50 shadow-[0_0_0_1px_rgba(255,214,10,0.3)]' : 'border-border-soft'} ${isRecommended ? 'animate-shimmer' : ''}`}
                            >
                                {isRecommended && (
                                    <span
                                        aria-hidden
                                        className="animate-glow-pulse absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-yellow-50/30 blur-3xl rounded-full pointer-events-none"
                                    />
                                )}
                                {isRecommended && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.8, y: -8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 18 }}
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-50 text-richblack-900 text-xs font-semibold px-3 py-1 rounded-full z-10"
                                    >
                                        Recommended
                                    </motion.span>
                                )}
                                <h2 className="text-xl font-bold text-richblack-5 mb-2">{plan.name}</h2>
                                <p className="text-3xl font-bold text-yellow-50 mb-4">
                                    {plan.priceInr ? `₹${plan.priceInr}/mo` : "Free"}
                                </p>
                                <ul className="text-richblack-200 text-sm space-y-2 mb-6 flex-1">
                                    <li>{plan.credits === null ? "Unlimited" : plan.credits} summaries / month</li>
                                    <li>{plan.maxMessagesPerChat === null ? "Unlimited" : plan.maxMessagesPerChat} messages per chat</li>
                                    <li>{plan.featureLimits?.docSummary === null ? "Unlimited" : plan.featureLimits?.docSummary} document summaries / month</li>
                                    <li>{plan.featureLimits?.bulkSummary === null ? "Unlimited" : plan.featureLimits?.bulkSummary} bulk uploads / month</li>
                                    <li>{plan.featureLimits?.audioSummary === null ? "Unlimited" : plan.featureLimits?.audioSummary} audio summaries / month</li>
                                    <li>{plan.key === 'Basic' ? "Key points + action items" : plan.key === 'Pro' ? "+ Sections & key terms" : "+ Quiz & flashcards"}</li>
                                    {plan.models?.length > 0 && (
                                        <li>Choice of AI model: {plan.models.join(', ')}</li>
                                    )}
                                </ul>
                                <IconBtn
                                    text={plan.key === user?.SubType ? "Current plan" : plan.key === 'Basic' ? "Included free" : "Upgrade"}
                                    disabled={plan.key === user?.SubType || plan.key === 'Basic'}
                                    onclick={() => handleUpgrade(plan.key)}
                                />
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Full comparison */}
                <motion.div {...viewportFadeUp} className="max-w-4xl mx-auto mt-20">
                    <h2 className="text-2xl font-bold text-richblack-5 text-center mb-2">Compare plans in detail</h2>
                    <p className="text-richblack-300 text-center mb-10">Exactly what's included — and what isn't — on each plan.</p>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[640px]">
                            <thead>
                                <tr className="border-b border-border-soft">
                                    <th className="text-left py-4 pr-4 text-richblack-300 text-sm font-medium">Feature</th>
                                    <th className="py-4 px-4 text-richblack-5 text-sm font-semibold text-center">Basic</th>
                                    <th className="py-4 px-4 text-richblack-5 text-sm font-semibold text-center">Pro</th>
                                    <th className="py-4 px-4 text-richblack-5 text-sm font-semibold text-center">Pro Max</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_ROWS.map((row, i) => (
                                    row.section ? (
                                        <tr key={`section-${i}`}>
                                            <td colSpan={4} className="pt-8 pb-2 text-yellow-50 text-xs font-semibold uppercase tracking-wide">
                                                {row.section}
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={row.label} className="border-b border-border-soft">
                                            <td className="py-3 pr-4 text-richblack-200 text-sm">{row.label}</td>
                                            <td className="py-3 px-4 text-center"><Cell value={row.basic} /></td>
                                            <td className="py-3 px-4 text-center"><Cell value={row.pro} /></td>
                                            <td className="py-3 px-4 text-center"><Cell value={row.proMax} /></td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </MarketingLayout>
    )
}

export default Pricing
