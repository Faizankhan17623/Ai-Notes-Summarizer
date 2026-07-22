import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { PaymentData } from "../Apis/PaymentApi.js"
import { setPlans, setCreditPacks, setPaymentsLive, setLoading, setHistory } from "../../Slices/paymentSlice.js"
import { setUser } from "../../Slices/authSlice.js"
import { GetProfile } from "./Auth.js"
import { loadRazorpayScript } from "../../utils/loadRazorpay.js"

const { plans, createOrder, verifyPayment, history, cancelSubscription } = PaymentData

export function GetPlans() {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", plans)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setPlans(response.data.plans))
            dispatch(setCreditPacks(response.data.creditPacks))
            dispatch(setPaymentsLive(response.data.paymentsLive))
        } catch (error) {
            logError("Error fetching plans", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// GET /payment/history sir — the account page's purchase history list, paid rows only
export function GetPurchaseHistory(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", history, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setHistory(response.data.payments))
        } catch (error) {
            logError("Error fetching purchase history", error)
        }
    }
}

// POST /payment/cancel sir — no recurring billing exists, so this is an early manual downgrade
// to Basic rather than stopping a future charge (see the backend controller's comment).
// Refetches the profile afterward so the Account page's plan card reflects Basic immediately.
export function CancelSubscription(token) {
    return async (dispatch) => {
        const toastId = toast.loading("Cancelling your plan...")
        try {
            const response = await apiConnector("POST", cancelSubscription, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error cancelling subscription", error)
            toast.error(error?.response?.data?.message || "Could not cancel your plan")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// stub-aware sir — surfaces the backend's "coming soon" message cleanly until real Razorpay keys are added
// accepts EITHER a plan key string (existing subscription-upgrade callers) or { packKey } (credit top-up)
export function CreateOrder(planOrPackBody, token) {
    const body = typeof planOrPackBody === 'string' ? { plan: planOrPackBody } : planOrPackBody
    return async () => {
        const toastId = toast.loading("Preparing checkout...")
        try {
            const response = await apiConnector("POST", createOrder, body, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Order created")
            return response.data
        } catch (error) {
            logError("Error creating order", error)
            toast.error(error?.response?.data?.message || "Payments are not available yet")
            return null
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// POST /payment/verify sir — checks the HMAC signature server-side and, on success, upgrades the plan
function VerifyPayment(paymentResponse, token) {
    return async (dispatch, getState) => {
        try {
            const response = await apiConnector("POST", verifyPayment, paymentResponse, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            // reflect the new plan immediately sir, without waiting for a full profile refetch —
            // only applies to a subscription upgrade; a credit-pack purchase returns
            // creditsGranted/bonusCredits instead and doesn't touch SubType at all
            if (response.data.plan) {
                const user = getState().auth.user
                if (user) {
                    const updatedUser = { ...user, SubType: response.data.plan }
                    dispatch(setUser(updatedUser))
                    localStorage.setItem("user", JSON.stringify(updatedUser))
                }
            }
            return true
        } catch (error) {
            logError("Error verifying payment", error)
            toast.error(error?.response?.data?.message || "Payment verification failed")
            return false
        }
    }
}

// the full flow sir — create the order, open Razorpay's Checkout.js, verify on success.
// on failure/dismissal it just leaves the user where they were, no partial-upgrade risk since
// the backend only upgrades the plan after a signature-verified /payment/verify call
export function StartCheckout(plan, token, userInfo) {
    return async (dispatch) => {
        const orderData = await dispatch(CreateOrder(plan, token))
        if (!orderData) return

        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
            toast.error("Could not load the payment gateway, please check your connection")
            return
        }

        const options = {
            key: orderData.key,
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: 'Notewise',
            description: `Upgrade to ${plan}`,
            order_id: orderData.order.id,
            handler: (response) => {
                dispatch(VerifyPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                }, token)).then(() => dispatch(GetPurchaseHistory(token)))
            },
            prefill: {
                name: userInfo?.firstName ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim() : '',
                email: userInfo?.email || '',
            },
            theme: { color: '#FFD60A' },
        }

        const razorpayInstance = new window.Razorpay(options)
        razorpayInstance.on('payment.failed', () => {
            toast.error('Payment failed, please try again')
        })
        razorpayInstance.open()
    }
}

// same flow as StartCheckout sir, but for a one-time credit-pack top-up rather than a
// subscription upgrade — refreshes the profile afterwards so the new bonusCredits balance shows
export function StartCreditPackCheckout(packKey, token, userInfo) {
    return async (dispatch) => {
        const orderData = await dispatch(CreateOrder({ packKey }, token))
        if (!orderData) return

        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
            toast.error("Could not load the payment gateway, please check your connection")
            return
        }

        const options = {
            key: orderData.key,
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: 'Notewise',
            description: `Credit top-up (${packKey})`,
            order_id: orderData.order.id,
            handler: (response) => {
                dispatch(VerifyPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                }, token)).then(() => {
                    dispatch(GetProfile(token))
                    dispatch(GetPurchaseHistory(token))
                })
            },
            prefill: {
                name: userInfo?.firstName ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim() : '',
                email: userInfo?.email || '',
            },
            theme: { color: '#FFD60A' },
        }

        const razorpayInstance = new window.Razorpay(options)
        razorpayInstance.on('payment.failed', () => {
            toast.error('Payment failed, please try again')
        })
        razorpayInstance.open()
    }
}
