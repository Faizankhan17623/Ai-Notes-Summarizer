import { logError } from "../../utils/logError.js"
import { apiConnector } from "../apiConnector.js"
import { SearchData } from "../Apis/SearchApi.js"
import { setSearchResults, setSearchLoading } from "../../Slices/searchSlice.js"

const { searchAll } = SearchData

// GET /search?q=... sir — one call across Notes/Chats/Flashcards/Quizzes, same apiConnector
// params-object convention already used by GetUsers/GetAiLogs (page, filters, etc.)
export function SearchAll(query, token) {
    return async (dispatch) => {
        dispatch(setSearchLoading(true))
        try {
            const response = await apiConnector("GET", searchAll, null, {
                Authorization: `Bearer ${token}`
            }, { q: query })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSearchResults(response.data.results))
        } catch (error) {
            logError("Error searching", error)
        } finally {
            dispatch(setSearchLoading(false))
        }
    }
}
