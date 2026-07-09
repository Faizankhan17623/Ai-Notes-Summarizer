import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    data: null,
    loading: false
}

const analyticsSlice = createSlice({
    name: "analytics",
    initialState,
    reducers: {
        setAnalytics(state, value) {
            state.data = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setAnalytics, setLoading } = analyticsSlice.actions
export default analyticsSlice.reducer
