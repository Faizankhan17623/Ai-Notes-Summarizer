import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    flashcards: [],       // cards for the currently viewed note
    dueFlashcards: [],     // cross-note review queue
    quizzes: [],           // quizzes for the currently viewed note
    activeQuiz: null,      // the quiz currently being taken
    weakTopics: [],         // tags the user is struggling with, see GetWeakTopics
    loading: false
}

const studyKitSlice = createSlice({
    name: "studyKit",
    initialState,
    reducers: {
        setFlashcards(state, value) {
            state.flashcards = value.payload
        },
        setDueFlashcards(state, value) {
            state.dueFlashcards = value.payload
        },
        setQuizzes(state, value) {
            state.quizzes = value.payload
        },
        setActiveQuiz(state, value) {
            state.activeQuiz = value.payload
        },
        setWeakTopics(state, value) {
            state.weakTopics = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setFlashcards, setDueFlashcards, setQuizzes, setActiveQuiz, setWeakTopics, setLoading } = studyKitSlice.actions
export default studyKitSlice.reducer
