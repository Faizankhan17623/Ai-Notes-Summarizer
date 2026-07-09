import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    hasKey: false,
    createdAt: null,
    lastUsedAt: null,
    // the raw key sir — held ONLY right after generation, for the "copy it now" moment.
    // never persisted to localStorage, never refetched — the backend can't give it back either.
    freshKey: null,
    loading: false
}

const apiKeySlice = createSlice({
    name: "apiKey",
    initialState,
    reducers: {
        setKeyStatus(state, value) {
            state.hasKey = value.payload.hasKey
            state.createdAt = value.payload.createdAt
            state.lastUsedAt = value.payload.lastUsedAt
        },
        setFreshKey(state, value) {
            state.freshKey = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setKeyStatus, setFreshKey, setLoading } = apiKeySlice.actions
export default apiKeySlice.reducer
