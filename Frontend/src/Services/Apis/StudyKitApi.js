const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const StudyKitData = {
    generateFlashcards: BASE_URL + "/notes",     // + /:noteId/flashcards
    flashcardsForNote: BASE_URL + "/notes",      // + /:noteId/flashcards
    dueFlashcards: BASE_URL + "/flashcards/due",
    reviewFlashcard: BASE_URL + "/flashcards",   // + /:id/review
    deleteFlashcard: BASE_URL + "/flashcards",   // + /:id

    generateQuiz: BASE_URL + "/notes",           // + /:noteId/quiz
    quizzesForNote: BASE_URL + "/notes",         // + /:noteId/quizzes
    attemptQuiz: BASE_URL + "/quizzes",          // + /:id/attempt
    deleteQuiz: BASE_URL + "/quizzes",           // + /:id
}
