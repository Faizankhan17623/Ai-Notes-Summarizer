import { useSelector } from 'react-redux'

// full-screen loader sir — shown for the brief window between Razorpay's own checkout
// confirming a plan-upgrade payment and /payment/verify finishing server-side, right up until
// StartCheckout (Services/operations/Payment.js) redirects to /Dashboard/New-Summary. Replaces
// the old "Upgraded to X" success toast entirely for this flow.
const PaymentVerifyOverlay = () => {
    const { verifying } = useSelector((state) => state.payment)

    if (!verifying) return null

    return (
        <div className="fixed inset-0 bg-richblack-900/90 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin" />
            <p className="text-richblack-5 font-semibold text-lg">Confirming your payment...</p>
        </div>
    )
}

export default PaymentVerifyOverlay
