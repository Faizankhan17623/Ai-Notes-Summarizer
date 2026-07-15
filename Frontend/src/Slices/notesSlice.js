import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    // the history list sir
    allNotes: [],
    // the summary just generated / currently viewed
    currentNote: null,
    // every tag/folder the user has ever used sir — powers the filter dropdowns
    tags: [],
    folders: [],
    relatedNotes: [],
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
        setTagsAndFolders(state, value) {
            state.tags = value.payload.tags
            state.folders = value.payload.folders
        },
        setRelatedNotes(state, value) {
            state.relatedNotes = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setAllNotes, setCurrentNote, setTagsAndFolders, setRelatedNotes, setLoading } = notesSlice.actions
export default notesSlice.reducer
