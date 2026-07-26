import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { FeedbackData } from "../Apis/FeedbackApi.js"

const { submit } = FeedbackData

// type is 'bug' | 'feature' sir. payload is always FormData here (route/title/description
// fields plus an optional `screenshot` file field) — same isFormData-detection shape as
// ImportNote in Services/operations/Notes.js, so axios sets the multipart content-type
// itself rather than this file forcing application/json
export async function SubmitFeedbackReport(type, formData, token) {
    try {
        const response = await apiConnector("POST", `${submit}/${type}`, formData, {
            Authorization: `Bearer ${token}`,
        })

        if (!response.data.success) {
            throw new Error(response.data.message)
        }

        toast.success(response.data.message || "Thanks for your report!")
        return true
    } catch (error) {
        logError(`Error submitting ${type} report`, error)
        toast.error(error?.response?.data?.message || "Could not submit your report, please try again")
        return false
    }
}
