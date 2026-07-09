import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { PaymentData } from "../Apis/PaymentApi.js"
import { setPlans, setPaymentsLive, setLoading } from "../../Slices/paymentSlice.js"

const { plans, createOrder } = PaymentData

export function GetPlans() {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", plans)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setPlans(response.data.plans))
            dispatch(setPaymentsLive(response.data.paymentsLive))
        } catch (error) {
            console.error("Error fetching plans", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// stub-aware sir — surfaces the backend's "coming soon" message cleanly until real Razorpay keys are added
export function CreateOrder(plan, token) {
    return async () => {
        const toastId = toast.loading("Preparing checkout...")
        try {
            const response = await apiConnector("POST", createOrder, { plan }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Order created")
            return response.data
        } catch (error) {
            console.error("Error creating order", error)
            toast.error(error?.response?.data?.message || "Payments are not available yet")
            return null
        } finally {
            toast.dismiss(toastId)
        }
    }
}
