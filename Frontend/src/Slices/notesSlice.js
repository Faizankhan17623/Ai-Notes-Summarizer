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
    // version history for whichever note the Report page currently has open sir
    noteVersions: [],
    loading: false,
    // label the full-screen overlay shows while loading is true sir — SummarizeLoaderOverlay
    // reads this instead of hardcoding one string, since Import uses different wording than
    // Summarize/Bulk (no AI call, so "Importing" not "Summarizing")
    loadingLabel: 'Summarizing the notes...'
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
        setNoteVersions(state, value) {
            state.noteVersions = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setLoadingLabel(state, value) {
            state.loadingLabel = value.payload
        }
    }
})

export const { setAllNotes, setCurrentNote, setTagsAndFolders, setRelatedNotes, setNoteVersions, setLoading, setLoadingLabel } = notesSlice.actions
export default notesSlice.reducer
