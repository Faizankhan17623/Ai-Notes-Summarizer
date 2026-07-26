import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { AdminData } from "../Apis/AdminApi.js"
import { setOverview, setAnalytics, setTraffic, setTrafficLoading, setUsers, setPayments, setAuditLogs, setAiLogs, setAnnouncements, setContactMessages, setSavedViews, setTicketActivity, setLoading } from "../../Slices/adminSlice.js"

const {
    overview, analytics, traffic, users, suspendUser, banUser, unbanUser, denyAppeal, setRole, deleteUser, payments, refundPayment, contactMessages,
    replyToContactMessage, addInternalNote, audit, aiLogs, activeAnnouncement, announcements, deactivateAnnouncement,
    savedViews, deleteSavedView, userActivity,
} = AdminData

export function GetOverview(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", overview, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setOverview(response.data.overview))
        } catch (error) {
            logError("Error fetching overview", error)
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
            logError("Error fetching analytics", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// range: 'day' | 'week' | 'month' | 'custom'; customFrom/customTo are ISO date strings,
// only sent when range==='custom' sir
export function GetTraffic(token, range = 'week', customFrom, customTo) {
    return async (dispatch) => {
        dispatch(setTrafficLoading(true))
        try {
            const params = { range }
            if (range === 'custom') {
                params.from = customFrom
                params.to = customTo
            }
            const response = await apiConnector("GET", traffic, null, { Authorization: `Bearer ${token}` }, params)
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setTraffic(response.data.traffic))
        } catch (error) {
            logError("Error fetching traffic", error)
            toast.error(error?.response?.data?.message || "Could not load traffic data")
        } finally {
            dispatch(setTrafficLoading(false))
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
            logError("Error fetching users", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// 2-strike, appealable track sir — see suspensionCount's comment in Backend/Models/User.js
export function SuspendUser(userId, banReason, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Suspending user...")
        try {
            const response = await apiConnector("PATCH", `${suspendUser}/${userId}/suspend`, { banReason }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("User suspended")
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not suspend user")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// instant and permanent sir — bypasses the suspend/appeal cycle entirely, see
// Backend/controllers/Admin.js directBanUser
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

// hard delete sir — immediate, no recovery buffer, see Backend/controllers/Admin.js deleteUser
export function DeleteUser(userId, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting user...")
        try {
            const response = await apiConnector("DELETE", `${deleteUser}/${userId}`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("User deleted")
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not delete user")
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

// permanent sir — the user stays banned, but their appeal option is gone for good (see
// Backend/controllers/Admin.js denyAppeal). Only ever unbanning starts a fresh appeal cycle.
export function DenyAppeal(userId, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Denying appeal...")
        try {
            const response = await apiConnector("PATCH", `${denyAppeal}/${userId}/deny-appeal`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Appeal denied")
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not deny the appeal")
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

// bulk variants sir — same shape as SuspendUser/BanUser/SetRole above, just an array body and
// a summary toast. onSettled fires whether the batch fully or partially succeeded, so
// Users.jsx can clear its row-selection state after any outcome (not just a clean success)
export function BulkSuspendUsers(userIds, banReason, token, onSettled) {
    return async (dispatch) => {
        const toastId = toast.loading(`Suspending ${userIds.length} user${userIds.length === 1 ? '' : 's'}...`)
        try {
            const response = await apiConnector("PATCH", `${suspendUser}/bulk-suspend`, { userIds, banReason }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success(response.data.message)
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not run the bulk suspend")
        } finally {
            toast.dismiss(toastId)
            if (onSettled) onSettled()
        }
    }
}

export function BulkBanUsers(userIds, banReason, token, onSettled) {
    return async (dispatch) => {
        const toastId = toast.loading(`Banning ${userIds.length} user${userIds.length === 1 ? '' : 's'}...`)
        try {
            const response = await apiConnector("PATCH", `${banUser}/bulk-ban`, { userIds, banReason }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success(response.data.message)
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not run the bulk ban")
        } finally {
            toast.dismiss(toastId)
            if (onSettled) onSettled()
        }
    }
}

export function BulkDeleteUsers(userIds, token, onSettled) {
    return async (dispatch) => {
        const toastId = toast.loading(`Deleting ${userIds.length} user${userIds.length === 1 ? '' : 's'}...`)
        try {
            const response = await apiConnector("DELETE", `${deleteUser}/bulk-delete`, { userIds }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success(response.data.message)
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not run the bulk delete")
        } finally {
            toast.dismiss(toastId)
            if (onSettled) onSettled()
        }
    }
}

export function BulkSetRole(userIds, role, token, onSettled) {
    return async (dispatch) => {
        const toastId = toast.loading(`Updating ${userIds.length} user${userIds.length === 1 ? '' : 's'}...`)
        try {
            const response = await apiConnector("PATCH", `${setRole}/bulk-role`, { userIds, role }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success(response.data.message)
            dispatch(GetUsers(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not run the bulk role update")
        } finally {
            toast.dismiss(toastId)
            if (onSettled) onSettled()
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
            logError("Error fetching payments", error)
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
            logError("Error fetching contact messages", error)
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

export function GetAuditLog(token, page = 1) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", audit, null, { Authorization: `Bearer ${token}` }, { page })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setAuditLogs({ logs: response.data.logs, total: response.data.total, page: response.data.page, pages: response.data.pages }))
        } catch (error) {
            logError("Error fetching audit log", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function GetAiLogs(token, page = 1, filters = {}) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", aiLogs, null, { Authorization: `Bearer ${token}` }, { page, ...filters })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setAiLogs({ logs: response.data.logs, total: response.data.total, page: response.data.page, pages: response.data.pages }))
        } catch (error) {
            logError("Error fetching AI logs", error)
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
            dispatch(setAnnouncements(response.data.announcements))
        } catch (error) {
            logError("Error fetching active announcement", error)
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
            logError("Error fetching announcements", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// timed: true sends startAt/endAt sir — raw values straight from a <input type="datetime-local">
// (see Announcements.jsx), untouched here. The backend is the only place that ever turns
// them into real Date objects (see parseRequiredDate in Backend/controllers/Admin.js) — this
// layer just relays what the admin picked, no date math or parsing on this side either
export function CreateAnnouncement(message, timed, startAt, endAt, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Publishing announcement...")
        try {
            const response = await apiConnector("POST", announcements, { message, timed, startAt, endAt }, { Authorization: `Bearer ${token}` })
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

export function EditAnnouncement(id, message, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Saving...")
        try {
            const response = await apiConnector("PATCH", `${announcements}/${id}`, { message }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Announcement updated")
            dispatch(GetAnnouncements(token))
            return true
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not update announcement")
            return false
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

export function DeleteAnnouncement(id, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting...")
        try {
            const response = await apiConnector("DELETE", `${announcements}/${id}`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("Announcement deleted")
            dispatch(GetAnnouncements(token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not delete announcement")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

// saved filter views sir — page is one of 'users'|'payments'|'audit'|'ai-logs'
export function GetSavedViews(page, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", savedViews, null, { Authorization: `Bearer ${token}` }, { page })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setSavedViews({ page, views: response.data.views }))
        } catch (error) {
            logError("Error fetching saved views", error)
        }
    }
}

export function CreateSavedView(page, name, filters, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Saving view...")
        try {
            const response = await apiConnector("POST", savedViews, { page, name, filters }, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            toast.success("View saved")
            dispatch(GetSavedViews(page, token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not save this view")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function DeleteSavedView(viewId, page, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("DELETE", `${deleteSavedView}/${viewId}`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(GetSavedViews(page, token))
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not delete this view")
        }
    }
}

// a ticket's submitter's recent AI activity sir — quiet failure like the read-only stat
// widgets elsewhere, this is a "help" panel, not a page anchor
export function GetTicketUserActivity(messageId, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", `${userActivity}/${messageId}/user-activity`, null, { Authorization: `Bearer ${token}` })
            if (!response.data.success) throw new Error(response.data.message)
            dispatch(setTicketActivity({ messageId, activity: response.data }))
        } catch (error) {
            logError("Error fetching ticket user activity", error)
        }
    }
}
