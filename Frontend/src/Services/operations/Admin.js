import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { AdminData } from "../Apis/AdminApi.js"
import { setOverview, setAnalytics, setUsers, setPayments, setAuditLogs, setAiLogs, setAnnouncements, setContactMessages, setLoading } from "../../Slices/adminSlice.js"

const {
    overview, analytics, users, banUser, unbanUser, setRole, payments, refundPayment, contactMessages,
    replyToContactMessage, addInternalNote, audit, aiLogs, activeAnnouncement, announcements, deactivateAnnouncement
} = AdminData

export function GetOverview(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", overview, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setOverview(response.data.overview))
        } catch (error) {
            console.error("Error fetching overview", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetAnalytics(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", analytics, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setAnalytics(response.data.analytics))
        } catch (error) {
            console.error("Error fetching analytics", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetUsers(token, page = 1, search = "") {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", users, null, { Authorization: `Bearer ${token}` }, { page, search })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setUsers({ users: response.data.users, total: response.data.total, page: response.data.page, pages: response.data.pages }))
        } catch (error) {
            console.error("Error fetching users", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function BanUser(userId, banReason, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Banning user...")
        try {
            const response = await apiConnector("PATCH", `${banUser}/${userId}/ban`, { banReason }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("User banned")
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not ban user")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function UnbanUser(userId, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Unbanning user...")
        try {
            const response = await apiConnector("PATCH", `${unbanUser}/${userId}/unban`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("User unbanned")
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not unban user")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function SetRole(userId, role, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Updating role...")
        try {
            const response = await apiConnector("PATCH", `${setRole}/${userId}/role`, { role }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Role updated")
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not update role")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GetPayments(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", payments, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setPayments(response.data.payments))
        } catch (error) {
            console.error("Error fetching payments", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function RefundPayment(paymentId, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Refunding payment...")
        try {
            const response = await apiConnector("PATCH", `${refundPayment}/${paymentId}/refund`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Payment refunded")
            dispatch(GetPayments(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not refund payment")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GetContactMessages(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", contactMessages, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setContactMessages(response.data.messages))
        } catch (error) {
            console.error("Error fetching contact messages", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function ReplyToContactMessage(messageId, replyMessage, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Sending reply...")
        try {
            const response = await apiConnector("POST", `${replyToContactMessage}/${messageId}/reply`, { replyMessage }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Reply sent")
            dispatch(GetContactMessages(token))
            return true
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not send reply")
            return false
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// private handoff note sir — Support/Admin only, never emailed or shown to the submitter
export function AddInternalNote(messageId, text, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Adding note...")
        try {
            const response = await apiConnector("POST", `${addInternalNote}/${messageId}/notes`, { text }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(GetContactMessages(token))
            return true
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not add the note")
            return false
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GetAuditLog(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", audit, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setAuditLogs(response.data.logs))
        } catch (error) {
            console.error("Error fetching audit log", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetAiLogs(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", aiLogs, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setAiLogs(response.data.logs))
        } catch (error) {
            console.error("Error fetching AI logs", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetActiveAnnouncement() {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", activeAnnouncement)
            if (!response.data.success) throw new Error(response.data.message)
            if (response.data.announcement) {
                dispatch(setAnnouncements([response.data.announcement]))
            }
        } catch (error) {
            console.error("Error fetching active announcement", error)
        }
    }
}

export function GetAnnouncements(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", announcements, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setAnnouncements(response.data.announcements))
        } catch (error) {
            console.error("Error fetching announcements", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function CreateAnnouncement(message, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Publishing announcement...")
        try {
            const response = await apiConnector("POST", announcements, { message }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Announcement published")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not publish announcement")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function DeactivateAnnouncement(id, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Deactivating...")
        try {
            const response = await apiConnector("PATCH", `${deactivateAnnouncement}/${id}/deactivate`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Announcement deactivated")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not deactivate announcement")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
