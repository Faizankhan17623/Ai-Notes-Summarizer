const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const NotesData = {
    summarize: BASE_URL + "/summarize",
    allNotes: BASE_URL + "/notes",
    tags: BASE_URL + "/notes/tags",
    singleNote: BASE_URL + "/notes",      // + /:noteId
    deleteNote: BASE_URL + "/notes",      // + /:noteId
    organizeNote: BASE_URL + "/notes",    // + /:noteId/organize
    enableShare: BASE_URL + "/notes",     // + /:noteId/share
    disableShare: BASE_URL + "/notes",    // + /:noteId/share
    sharedNote: BASE_URL + "/shared",     // + /:shareId
    exportNote: BASE_URL + "/notes",      // + /:noteId/export/:format
    relatedNotes: BASE_URL + "/notes",    // + /:noteId/related
}
