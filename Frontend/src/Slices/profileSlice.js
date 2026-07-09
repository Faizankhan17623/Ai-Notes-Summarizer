import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    profile: null,
    plan: null,
    activity: null,
    loading: false
}

const profileSlice = createSlice({
    name: "profile",
    initialState,
    reducers: {
        setProfile(state, value) {
            state.profile = value.payload
        },
        setPlan(state, value) {
            state.plan = value.payload
        },
        setActivity(state, value) {
            state.activity = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setProfile, setPlan, setActivity, setLoading } = profileSlice.actions
export default profileSlice.reducer
