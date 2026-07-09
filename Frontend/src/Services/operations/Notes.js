import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { NotesData } from "../Apis/NotesApi.js"
import { setAllNotes, setCurrentNote, setLoading } from "../../Slices/notesSlice.js"

const { summarize, allNotes, singleNote, deleteNote } = NotesData

// summarize sir — pass either { notes: text, sourceType } or a FormData with a `notes` file field
export function SummarizeNotes(payload, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Summarizing your notes...")
        try {
            const isFormData = payload instanceof FormData
            const response = await apiConnector("POST", summarize, payload, {
                Authorization: `Bearer ${token}`,
                ...(isFormData ? {} : { "Content-Type": "application/json" })
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Summary ready")
            dispatch(setCurrentNote({ _id: response.data.noteId, summary: response.data.summary }))
            if (navigate) navigate(`/Dashboard/Note/${response.data.noteId}`)
        } catch (error) {
            console.error("Error summarizing notes", error)
            toast.error(error?.response?.data?.message || "Could not summarize your notes")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetAllNotes(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", allNotes, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllNotes(response.data.notes))
        } catch (error) {
            console.error("Error fetching notes", error)
        }
    }
}

export function GetSingleNote(noteId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${singleNote}/${noteId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentNote(response.data.note))
        } catch (error) {
            console.error("Error fetching note", error)
            toast.error(error?.response?.data?.message || "Could not load the note")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function DeleteNote(noteId, token, navigate) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting note...")
        try {
            const response = await apiConnector("DELETE", `${deleteNote}/${noteId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Note deleted")
            dispatch(setCurrentNote(null))
            dispatch(GetAllNotes(token))
            if (navigate) navigate("/Dashboard/History")
        } catch (error) {
            console.error("Error deleting note", error)
            toast.error(error?.response?.data?.message || "Could not delete the note")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
