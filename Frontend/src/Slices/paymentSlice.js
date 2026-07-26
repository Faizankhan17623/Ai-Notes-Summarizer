import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    plans: [],
    creditPacks: [],
    paymentsLive: false,
    loading: false,
    history: [],
    // full-screen loader shown while a plan-upgrade payment is being verified sir, right up
    // until the redirect to /Dashboard — see StartCheckout in Payment.js
    verifying: false,
    // set to the purchased plan key once verification succeeds sir — drives the "Start
    // learning" success popup on /Dashboard (see PaymentSuccessModal.jsx); null hides it
    purchasedPlan: null
}

const paymentSlice = createSlice({
    name: "payment",
    initialState,
    reducers: {
        setPlans(state, value) {
            state.plans = value.payload
        },
        setCreditPacks(state, value) {
            state.creditPacks = value.payload
        },
        setPaymentsLive(state, value) {
            state.paymentsLive = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setHistory(state, value) {
            state.history = value.payload
        },
        setVerifying(state, value) {
            state.verifying = value.payload
        },
        setPurchasedPlan(state, value) {
            state.purchasedPlan = value.payload
        }
    }
})

export const { setPlans, setCreditPacks, setPaymentsLive, setLoading, setHistory, setVerifying, setPurchasedPlan } = paymentSlice.actions
export default paymentSlice.reducer
