import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'motion/react'
import { FaCheck, FaRocket } from 'react-icons/fa'
import { setPurchasedPlan } from '../../Slices/paymentSlice.js'

// "Start learning" success popup sir — shown on /Dashboard right after StartCheckout
// (Services/operations/Payment.js) redirects there post-verification, replacing the old
// "Upgraded to X" toast entirely. purchasedPlan holds the plan KEY; looked up against
// state.payment.plans (already loaded by Pricing.jsx before checkout even started) for the
// display name, so this doesn't need its own fetch.
const PaymentSuccessModal = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { purchasedPlan, plans } = useSelector((state) => state.payment)
    const planName = plans.find((p) => p.key === purchasedPlan)?.name || purchasedPlan

    const dismiss = () => dispatch(setPurchasedPlan(null))

    return (
        <AnimatePresence>
            {purchasedPlan && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-richblack-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center px-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 16 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        className="relative bg-surface-raised border border-border-soft rounded-xl p-8 max-w-sm w-full text-center overflow-hidden"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
                            className="mx-auto w-16 h-16 rounded-full bg-good/10 text-good flex items-center justify-center mb-5"
                        >
                            <FaCheck size={26} />
                        </motion.div>

                        <h2 className="text-richblack-5 text-xl font-bold mb-2">You're upgraded!</h2>
                        <p className="text-richblack-300 text-sm mb-7">
                            You've successfully purchased the <span className="text-yellow-50 font-semibold">{planName}</span> plan.
                        </p>

                        <button
                            onClick={() => {
                                dismiss()
                                navigate('/Dashboard/New-Summary')
                            }}
                            className="w-full bg-yellow-50 text-richblack-900 font-semibold rounded-md py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:scale-[0.98] transition-transform"
                        >
                            <FaRocket size={13} /> Start learning
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default PaymentSuccessModal
