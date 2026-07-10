import toast from "react-hot-toast"
import { apiConnector, axiosinstance } from "../apiConnector.js"
import { StudyKitData } from "../Apis/StudyKitApi.js"
import { setFlashcards, setDueFlashcards, setQuizzes, setActiveQuiz, setLoading } from "../../Slices/studyKitSlice.js"

const {
    generateFlashcards, flashcardsForNote, dueFlashcards, reviewFlashcard, deleteFlashcard,
    generateQuiz, quizzesForNote, attemptQuiz, deleteQuiz, exportReviewQueue
} = StudyKitData

// ---------- Flashcards ----------

export function GenerateFlashcards(noteId, count, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Generating flashcards...")
        try {
            const response = await apiConnector("POST", `${generateFlashcards}/${noteId}/flashcards`, { count }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(`${response.data.flashcards.length} flashcards generated`)
            dispatch(GetFlashcardsForNote(noteId, token))
        } catch (error) {
            console.error("Error generating flashcards", error)
            toast.error(error?.response?.data?.message || "Could not generate flashcards")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetFlashcardsForNote(noteId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", `${flashcardsForNote}/${noteId}/flashcards`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setFlashcards(response.data.flashcards))
        } catch (error) {
            console.error("Error fetching flashcards", error)
        }
    }
}

export function GetDueFlashcards(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", dueFlashcards, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setDueFlashcards(response.data.flashcards))
        } catch (error) {
            console.error("Error fetching due flashcards", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// rating is 'again' | 'hard' | 'good' | 'easy' sir
export function ReviewFlashcard(cardId, rating, token) {
    return async (dispatch, getState) => {
        try {
            const response = await apiConnector("POST", `${reviewFlashcard}/${cardId}/review`, { rating }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            // pull the just-reviewed card out of the due queue so the review session moves on sir
            const remaining = getState().studyKit.dueFlashcards.filter((c) => c._id !== cardId)
            dispatch(setDueFlashcards(remaining))
        } catch (error) {
            console.error("Error reviewing flashcard", error)
            toast.error(error?.response?.data?.message || "Could not record the review")
        }
    }
}

export function DeleteFlashcard(cardId, noteId, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting flashcard...")
        try {
            const response = await apiConnector("DELETE", `${deleteFlashcard}/${cardId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Flashcard deleted")
            dispatch(GetFlashcardsForNote(noteId, token))
        } catch (error) {
            console.error("Error deleting flashcard", error)
            toast.error(error?.response?.data?.message || "Could not delete the flashcard")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// downloads the whole due-flashcard review queue as a PDF study sheet sir — same blob/object-URL
// pattern already used by ExportNote in Services/operations/Notes.js
export function ExportReviewQueue(token) {
    return async () => {
        const toastId = toast.loading("Preparing your review queue PDF...")
        try {
            const response = await axiosinstance({
                method: 'GET',
                url: exportReviewQueue,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'review-queue.pdf')
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            toast.success('Export ready')
        } catch (error) {
            console.error("Error exporting the review queue", error)
            toast.error("Could not export the review queue")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// ---------- Quiz ----------

export function GenerateQuiz(noteId, count, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Generating quiz...")
        try {
            const response = await apiConnector("POST", `${generateQuiz}/${noteId}/quiz`, { count }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Quiz ready")
            dispatch(setActiveQuiz(response.data.quiz))
            dispatch(GetQuizzesForNote(noteId, token))
        } catch (error) {
            console.error("Error generating quiz", error)
            toast.error(error?.response?.data?.message || "Could not generate the quiz")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetQuizzesForNote(noteId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", `${quizzesForNote}/${noteId}/quizzes`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setQuizzes(response.data.quizzes))
        } catch (error) {
            console.error("Error fetching quizzes", error)
        }
    }
}

export function AttemptQuiz(quizId, answers, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("POST", `${attemptQuiz}/${quizId}/attempt`, { answers }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setActiveQuiz(response.data.quiz))
            return response.data
        } catch (error) {
            console.error("Error submitting quiz attempt", error)
            toast.error(error?.response?.data?.message || "Could not submit your answers")
            return null
        }
    }
}

export function DeleteQuiz(quizId, noteId, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting quiz...")
        try {
            const response = await apiConnector("DELETE", `${deleteQuiz}/${quizId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Quiz deleted")
            dispatch(GetQuizzesForNote(noteId, token))
        } catch (error) {
            console.error("Error deleting quiz", error)
            toast.error(error?.response?.data?.message || "Could not delete the quiz")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
