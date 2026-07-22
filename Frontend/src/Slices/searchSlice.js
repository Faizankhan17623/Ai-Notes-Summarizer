import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    // grouped by content type sir — mirrors the backend's searchAll response shape
    results: { notes: [], chats: [], flashcards: [], quizzes: [] },
    loading: false
}

const searchSlice = createSlice({
    name: "search",
    initialState,
    reducers: {
        setSearchResults(state, value) {
            state.results = value.payload
        },
        setSearchLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setSearchResults, setSearchLoading } = searchSlice.actions
export default searchSlice.reducer
