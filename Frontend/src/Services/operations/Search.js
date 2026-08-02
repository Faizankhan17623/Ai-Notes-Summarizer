import { logError } from "../../utils/logError.js"
import { apiConnector } from "../apiConnector.js"
import { SearchData } from "../Apis/SearchApi.js"
import { setSearchResults, setSearchLoading } from "../../Slices/searchSlice.js"

const { searchAll } = SearchData

// GET /search?q=... sir — one call across Notes/Chats/Flashcards/Quizzes, same apiConnector
// params-object convention already used by GetUsers/GetAiLogs (page, filters, etc.).
// signal is optional sir — the caller (SearchResults.jsx) aborts the previous in-flight
// search before firing a new debounced one, so a slow earlier response can't land after and
// overwrite a faster later one
export function SearchAll(query, token, signal) {
    return async (dispatch) => {
        dispatch(setSearchLoading(true))
        try {
            const response = await apiConnector("GET", searchAll, null, {
                Authorization: `Bearer ${token}`
            }, { q: query }, signal)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSearchResults(response.data.results))
        } catch (error) {
            if (error.code === 'ERR_CANCELED') return
            logError("Error searching", error)
        } finally {
            if (!signal?.aborted) dispatch(setSearchLoading(false))
        }
    }
}
