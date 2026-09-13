import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    profile: null,
    plan: null,
    activity: null,
    loading: false,
    // Pro/ProMax model picker sir — models is [] on Basic (no choice), preferredModel mirrors
    // User.preferredModel (null means "using the plan default")
    models: [],
    preferredModel: null
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
        },
        setModelCatalog(state, value) {
            state.models = value.payload.models
            state.preferredModel = value.payload.preferredModel
        }
    }
})

export const { setProfile, setPlan, setActivity, setLoading, setModelCatalog } = profileSlice.actions
export default profileSlice.reducer
