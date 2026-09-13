import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { TwoFactorData } from "../Apis/TwoFactorApi.js"
import { applySession } from "./Auth.js"
import { setLoading } from "../../Slices/authSlice.js"

const { setup, enable, disable, verify } = TwoFactorData

// GET /2fa/setup sir — returns {secret, qrDataUrl}, nothing persisted yet. Plain async
// function (not a thunk) since it only returns a value for the calling component to render,
// same reasoning as GetOAuthProviders in Services/operations/Auth.js
export async function GetTwoFactorSetup(token) {
    try {
        const response = await apiConnector("GET", setup, null, { Authorization: `Bearer ${token}` })
        if (!response.data.success) throw new Error(response.data.message)
        return response.data
    } catch (error) {
        logError("Error starting 2FA setup", error)
        toast.error(error?.response?.data?.message || "Could not start two-factor setup")
        return null
    }
}

// POST /2fa/enable sir — {secret, code} round-trips the secret /setup just handed back.
// Returns the one-time backup codes on success so Account.jsx can show them once. Plain
// async function, not a thunk — same reasoning as GetTwoFactorSetup above, no Redux state
// changes as a result of enabling 2FA (the account page just re-renders from its own local
// "enabled" flag once this resolves).
export async function EnableTwoFactor(secret, code, token) {
    const toastId = toast.loading("Verifying...")
    try {
        const response = await apiConnector("POST", enable, { secret, code }, { Authorization: `Bearer ${token}` })
        if (!response.data.success) throw new Error(response.data.message)
        toast.success("Two-factor authentication enabled")
        return response.data.backupCodes
    } catch (error) {
        logError("Error enabling 2FA", error)
        toast.error(error?.response?.data?.message || "Could not enable two-factor authentication")
        return null
    } finally {
        toast.dismiss(toastId)
    }
}

// POST /2fa/disable sir — requires the current password, same re-confirm-before-security-
// change pattern as everywhere else in the app. Plain async function, same reasoning as above.
export async function DisableTwoFactor(password, token) {
    const toastId = toast.loading("Disabling two-factor authentication...")
    try {
        const response = await apiConnector("POST", disable, { password }, { Authorization: `Bearer ${token}` })
        if (!response.data.success) throw new Error(response.data.message)
        toast.success("Two-factor authentication disabled")
        return true
    } catch (error) {
        logError("Error disabling 2FA", error)
        toast.error(error?.response?.data?.message || "Could not disable two-factor authentication")
        return false
    } finally {
        toast.dismiss(toastId)
    }
}

// POST /2fa/verify sir — the second half of a 2FA login (see LoginUser's twoFactorRequired
// branch in Services/operations/Auth.js). code can be a live TOTP or a backup code; on
// success applies the session exactly like a normal password login would.
export function VerifyTwoFactor(tempToken, code, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Verifying...")
        try {
            const response = await apiConnector("POST", verify, { tempToken, code })
            if (!response.data.success) throw new Error(response.data.message)

            toast.success("Logged in")
            applySession(dispatch, response.data, navigate)
        } catch (error) {
            logError("Error verifying 2FA code", error)
            toast.error(error?.response?.data?.message || "Could not verify your code")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}
