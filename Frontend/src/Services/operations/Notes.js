import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector, axiosinstance } from "../apiConnector.js"
import { NotesData } from "../Apis/NotesApi.js"
import { setAllNotes, setCurrentNote, setTagsAndFolders, setRelatedNotes, setLoading } from "../../Slices/notesSlice.js"

const { summarize, allNotes, tags, singleNote, deleteNote, organizeNote, enableShare, disableShare, sharedNote, exportNote, relatedNotes } = NotesData

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
            logError("Error summarizing notes", error)
            toast.error(error?.response?.data?.message || "Could not summarize your notes")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// bulk sir — pass a FormData with multiple `notes` file fields appended. Backend always
// replies 200 with a per-file { fileName, ok, noteId/title or message } array so partial
// success (some files summarized, some failed) isn't treated as a hard error
export function BulkSummarizeNotes(formData, token, onDone) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Summarizing your files...")
        try {
            const response = await apiConnector("POST", summarize, formData, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            const results = response.data.results || []
            const succeeded = results.filter((r) => r.ok).length
            const failed = results.length - succeeded

            if (succeeded && !failed) {
                toast.success(`Summarized all ${succeeded} files`)
            } else if (succeeded) {
                toast.success(`Summarized ${succeeded} of ${results.length} files`)
            } else {
                toast.error("Could not summarize any of those files")
            }

            dispatch(GetAllNotes(token))
            if (onDone) onDone(results)
        } catch (error) {
            logError("Error bulk summarizing notes", error)
            toast.error(error?.response?.data?.message || "Could not summarize those files")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// one article link sir — used by the Dashboard Articles page, which summarizes a list of
// links ONE AT A TIME (sequential keeps each request inside Groq's per-minute token limit
// and lets the page show live per-link status). Not a thunk on purpose: the caller owns
// the loop and the per-row UI state, so this just returns { ok, noteId, title | message }
export async function SummarizeArticleLink(url, token) {
    try {
        const response = await apiConnector("POST", summarize, { url }, {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        })
        if (!response.data.success) {
            return { ok: false, message: response.data.message || "Could not summarize that article" }
        }
        return { ok: true, noteId: response.data.noteId, title: response.data.summary?.title || "Untitled note" }
    } catch (error) {
        logError("Error summarizing article link", error)
        return {
            ok: false,
            rateLimited: error?.response?.status === 429,
            message: error?.response?.data?.message || "Could not summarize that article"
        }
    }
}

// filters is optional sir — { search, tag, folder, pinned, favorite } — all independent, pass only what's needed
export function GetAllNotes(token, filters = {}) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", allNotes, null, {
                Authorization: `Bearer ${token}`
            }, filters)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllNotes(response.data.notes))
        } catch (error) {
            logError("Error fetching notes", error)
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
            logError("Error fetching note", error)
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
            logError("Error deleting note", error)
            toast.error(error?.response?.data?.message || "Could not delete the note")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GetTagsAndFolders(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", tags, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setTagsAndFolders({ tags: response.data.tags, folders: response.data.folders }))
        } catch (error) {
            logError("Error fetching tags/folders", error)
        }
    }
}

// updates sir — pass only the fields you want to change: { tags, folder, pinned }
export function OrganizeNote(noteId, updates, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${organizeNote}/${noteId}/organize`, updates, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentNote(response.data.note))
            dispatch(GetTagsAndFolders(token))
            toast.success("Note updated")
        } catch (error) {
            logError("Error organizing note", error)
            toast.error(error?.response?.data?.message || "Could not update the note")
        }
    }
}

export function EnableShare(noteId, token) {
    return async () => {
        try {
            const response = await apiConnector("POST", `${enableShare}/${noteId}/share`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.shareId
        } catch (error) {
            logError("Error enabling share", error)
            toast.error(error?.response?.data?.message || "Could not enable sharing")
            return null
        }
    }
}

export function DisableShare(noteId, token) {
    return async () => {
        try {
            const response = await apiConnector("DELETE", `${disableShare}/${noteId}/share`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Sharing disabled")
            return true
        } catch (error) {
            logError("Error disabling share", error)
            toast.error(error?.response?.data?.message || "Could not disable sharing")
            return false
        }
    }
}

// public sir — no auth header, used by the standalone SharedNote page
export function GetSharedNote(shareId) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${sharedNote}/${shareId}`)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentNote(response.data.note))
        } catch (error) {
            logError("Error fetching shared note", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// tag-overlap "related notes" for the Report page sidebar sir — quiet failure, this is a
// nice-to-have widget, not worth a toast if it doesn't load
export function GetRelatedNotes(noteId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", `${relatedNotes}/${noteId}/related`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setRelatedNotes(response.data.notes))
        } catch (error) {
            logError("Error fetching related notes", error)
        }
    }
}

// triggers a real file download sir — axios responseType 'blob' + a synthetic <a> click,
// since the browser has no native "download this authenticated URL" primitive
export function ExportNote(noteId, format, title, token) {
    return async () => {
        const toastId = toast.loading(`Exporting as ${format.toUpperCase()}...`)
        try {
            const response = await axiosinstance({
                method: 'GET',
                url: `${exportNote}/${noteId}/export/${format}`,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `${title || 'note'}.${format}`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            toast.success('Export ready')
        } catch (error) {
            logError("Error exporting note", error)
            toast.error("Could not export the note")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
