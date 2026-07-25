import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    flashcards: [],       // cards for the currently viewed note
    dueFlashcards: [],     // cross-note review queue
    quizzes: [],           // quizzes for the currently viewed note
    activeQuiz: null,      // the quiz currently being taken
    weakTopics: [],         // tags the user is struggling with, see GetWeakTopics
    studyPlan: null,        // today's AI-generated plan, see GetTodayStudyPlan/GenerateStudyPlan
    planLoading: false,
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
        setStudyPlan(state, value) {
            state.studyPlan = value.payload
        },
        setPlanLoading(state, value) {
            state.planLoading = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setFlashcards, setDueFlashcards, setQuizzes, setActiveQuiz, setWeakTopics, setStudyPlan, setPlanLoading, setLoading } = studyKitSlice.actions
export default studyKitSlice.reducer
