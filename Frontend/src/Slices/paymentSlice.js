import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    plans: [],
    paymentsLive: false,
    loading: false
}

const paymentSlice = createSlice({
    name: "payment",
    initialState,
    reducers: {
        setPlans(state, value) {
            state.plans = value.payload
        },
        setPaymentsLive(state, value) {
            state.paymentsLive = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setPlans, setPaymentsLive, setLoading } = paymentSlice.actions
export default paymentSlice.reducer
