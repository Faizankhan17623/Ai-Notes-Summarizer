import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { ContactData } from "../Apis/ContactApi.js"

const { submit } = ContactData

// public form sir — no token/auth, unlike every other operation file. Returns a plain
// boolean (not a thunk) since the Contact page has no Redux state of its own to update.
export async function SubmitContactMessage(name, email, message) {
    try {
        const response = await apiConnector("POST", submit, { name, email, message })

        if (!response.data.success) {
            throw new Error(response.data.message)
        }

        return true
    } catch (error) {
        logError("Error sending contact message", error)
        toast.error(error?.response?.data?.message || "Could not send your message, please try again")
        return false
    }
}
