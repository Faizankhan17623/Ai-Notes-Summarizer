import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    plans: [],
    creditPacks: [],
    paymentsLive: false,
    loading: false,
    history: []
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
        }
    }
})

export const { setPlans, setCreditPacks, setPaymentsLive, setLoading, setHistory } = paymentSlice.actions
export default paymentSlice.reducer
