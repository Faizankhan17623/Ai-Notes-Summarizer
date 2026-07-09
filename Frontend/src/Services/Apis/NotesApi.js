const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const NotesData = {
    summarize: BASE_URL + "/summarize",
    allNotes: BASE_URL + "/notes",
    singleNote: BASE_URL + "/notes",      // + /:noteId
    deleteNote: BASE_URL + "/notes",      // + /:noteId
}
