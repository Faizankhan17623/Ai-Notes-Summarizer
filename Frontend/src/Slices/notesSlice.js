import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    // the history list sir
    allNotes: [],
    // the summary just generated / currently viewed
    currentNote: null,
    loading: false
}

const notesSlice = createSlice({
    name: "notes",
    initialState,
    reducers: {
        setAllNotes(state, value) {
            state.allNotes = value.payload
        },
        setCurrentNote(state, value) {
            state.currentNote = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setAllNotes, setCurrentNote, setLoading } = notesSlice.actions
export default notesSlice.reducer
