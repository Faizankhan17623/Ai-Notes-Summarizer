import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { apiConnector, setCsrfToken } from "../apiConnector.js"
import { UserData } from "../Apis/UserApi.js"
import { OAuthData } from "../Apis/OAuthApi.js"
import { setLoading, setToken, setUser, setLogin, setSignupData } from "../../Slices/authSlice.js"
import { setProfile, setPlan, setActivity, setModelCatalog } from "../../Slices/profileSlice.js"

const {
    sendOtp, createUser, login, forgotPassword, resetPassword, profile, updateFirstName, updateLastName,
    updateDigestPreference, updateDailyGoal, modelCatalog, updateModel, completeOnboarding, updatePassword,
    deleteAccount, recoverAccount, logout, csrfToken, appeal
} = UserData

// fetched once on app mount and again right after login sir — the CSRF secret cookie may be
// freshly (re)set at login, so the in-memory token needs to be refreshed to match
export function FetchCsrfToken() {
    return async () => {
        try {
            const response = await apiConnector("GET", csrfToken)
            if (response.data?.success) {
                setCsrfToken(response.data.csrfToken)
            }
        } catch (error) {
            logError("Error fetching CSRF token", error)
        }
    }
}

export function SendOtp(email, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Sending OTP...")
        try {
            const response = await apiConnector("POST", sendOtp, { email })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("OTP sent to your email")
            // NOTE: do not overwrite signupData here — Join.jsx already stored the full
            // firstName/lastName/email/password before calling this, and OTP.jsx needs all
            // of it to build the /Createuser request. Clobbering it to { email } here was
            // exactly why createUser used to fail with "All fields are required".
            if (navigate) navigate("/Verify-Otp")
        } catch (error) {
            logError("Error sending OTP", error)
            toast.error(error?.response?.data?.message || "Could not send OTP")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function CreateUser(formData, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Creating your account...")
        try {
            const response = await apiConnector("POST", createUser, formData)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Account created, please log in")
            dispatch(setSignupData(null))
            if (navigate) navigate("/Login")
        } catch (error) {
            logError("Error creating account", error)
            toast.error(error?.response?.data?.message || "Could not create account")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// shared by LoginUser (password) and CompleteOAuthLogin (social) sir — both end up with the
// exact same {token, user} shape from the backend (see Backend/controllers/OAuth.js
// getOAuthSession's comment), so both should apply it identically rather than duplicating
// this dispatch/localStorage/redirect sequence
const applySession = (dispatch, { token, user }, navigate) => {
    dispatch(setToken(token))
    dispatch(setUser(user))
    dispatch(setLogin(true))
    localStorage.setItem("token", JSON.stringify(token))
    localStorage.setItem("user", JSON.stringify(user))
    // the CSRF secret cookie is freshly (re)set on login sir — refresh the in-memory token to match
    dispatch(FetchCsrfToken())
    // each role lands on its own separate dashboard sir, never another role's
    // (PrivateRoute/AdminRoute/SupportRoute enforce this too, this just skips the redirect flash)
    const landingPath = user?.role === 'Admin' ? '/Admin' : user?.role === 'Support' ? '/Support' : '/Dashboard'
    if (navigate) navigate(landingPath)
}

export function LoginUser(email, password, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Logging in...")
        try {
            const response = await apiConnector("POST", login, { email, password })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Logged in")
            applySession(dispatch, response.data, navigate)
        } catch (error) {
            logError("Error logging in", error)
            toast.error(error?.response?.data?.message || "Could not log in")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

// GET /oauth/session sir — called once by OAuthCallback.jsx on mount. The backend's OAuth
// callback already set the same httpOnly cookies a password login sets (see
// Backend/controllers/OAuth.js oauthCallback), this just fetches the {token, user} JSON body
// a redirect can't deliver, using that cookie to prove who just signed in.
export function CompleteOAuthLogin(navigate) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", OAuthData.session)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Logged in")
            applySession(dispatch, response.data, navigate)
            return true
        } catch (error) {
            logError("Error completing OAuth login", error)
            toast.error(error?.response?.data?.message || "Could not complete sign-in")
            if (navigate) navigate("/Login")
            return false
        }
    }
}

// GET /oauth/providers sir — public, tells the Login/Signup pages which "Continue with X"
// buttons to actually show (a provider with no configured client id/secret is hidden, not
// a broken button — same stub-mode idea as Razorpay's isConfigured flag for payments).
// Plain async function, not a thunk sir — it only ever returns a value, never touches Redux
export async function GetOAuthProviders() {
    try {
        const response = await apiConnector("GET", OAuthData.providers)
        return response.data?.success ? response.data.providers : []
    } catch (error) {
        logError("Error fetching OAuth providers", error)
        return []
    }
}

export function LogoutUser(navigate) {
    return async (dispatch) => {
        try {
            await apiConnector("POST", logout)
        } catch (error) {
            // best-effort sir — clear local state regardless, the access token will simply expire on its own
            logError("Error logging out on the server", error)
        }
        dispatch(setToken(null))
        dispatch(setUser(null))
        dispatch(setLogin(false))
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        toast.success("Logged out")
        if (navigate) navigate("/")
    }
}

export function ForgotPassword(email) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Sending reset link...")
        let sent = false
        try {
            const response = await apiConnector("POST", forgotPassword, { email })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Reset link sent to your email")
            sent = true
        } catch (error) {
            logError("Error sending reset link", error)
            toast.error(error?.response?.data?.message || "Could not send reset link")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
        // caller uses this to swap the form for a success screen sir — a toast alone
        // is easy to miss, especially on a page the user is about to navigate away from
        return sent
    }
}

export function ResetPassword(token, newPassword, confirmNewPassword, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Resetting password...")
        try {
            const response = await apiConnector("POST", resetPassword, { token, newPassword, confirmNewPassword })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Password reset, please log in")
            if (navigate) navigate("/Login")
        } catch (error) {
            logError("Error resetting password", error)
            toast.error(error?.response?.data?.message || "Could not reset password")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetProfile(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", profile, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setProfile(response.data.user))
            dispatch(setPlan(response.data.plan))
            dispatch(setActivity(response.data.activity))
            // keep auth.user's ban/appeal fields in sync too sir — GetProfile runs on every
            // dashboard load and is the only thing that can ever move a banned user OUT of
            // 'pending' into 'denied' (an admin's Deny) without them logging out and back in
            dispatch(setUser(response.data.user))
            localStorage.setItem("user", JSON.stringify(response.data.user))
        } catch (error) {
            logError("Error fetching profile", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// POST /appeal sir — one-shot, banned users only. Returns true/false so the locked-dashboard
// form can swap to the "pending" state on success without a second round-trip.
export function AppealBan(message, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Submitting your appeal...")
        let submitted = false
        try {
            const response = await apiConnector("POST", appeal, { message }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Appeal submitted")
            submitted = true
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error submitting appeal", error)
            toast.error(error?.response?.data?.message || "Could not submit your appeal")
        } finally {
            toast.dismiss(toastId)
        }
        return submitted
    }
}

// dismisses the onboarding checklist sir — one-way, called either when the user clicks
// "Dismiss" or automatically once all 3 checklist steps are done
export function CompleteOnboarding(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", completeOnboarding, null, {
                Authorization: `Bearer ${token}`
            })
            if (response.data.success) {
                dispatch(setProfile(response.data.user))
            }
        } catch (error) {
            logError("Error completing onboarding", error)
        }
    }
}

export function UpdateFirstName(firstName, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Updating...")
        try {
            const response = await apiConnector("PATCH", updateFirstName, { firstName }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("First name updated")
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error updating first name", error)
            toast.error(error?.response?.data?.message || "Could not update first name")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function UpdateLastName(lastName, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Updating...")
        try {
            const response = await apiConnector("PATCH", updateLastName, { lastName }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Last name updated")
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error updating last name", error)
            toast.error(error?.response?.data?.message || "Could not update last name")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function UpdateDigestPreference(receiveDigest, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", updateDigestPreference, { receiveDigest }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(receiveDigest ? "Weekly digest emails turned on" : "Weekly digest emails turned off")
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error updating digest preference", error)
            toast.error(error?.response?.data?.message || "Could not update your preference")
        }
    }
}

export function UpdateDailyGoal(dailyGoal, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", updateDailyGoal, { dailyGoal }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Daily study goal updated")
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error updating daily goal", error)
            toast.error(error?.response?.data?.message || "Could not update your goal")
        }
    }
}

// GET /profile/model-catalog sir — the model list this user's CURRENT plan can pick from
export function GetModelCatalog(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", modelCatalog, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setModelCatalog({ models: response.data.models, preferredModel: response.data.preferredModel }))
        } catch (error) {
            logError("Error fetching model catalog", error)
        }
    }
}

// pass null to reset to the plan's default model sir
export function UpdateModelPreference(model, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", updateModel, { model }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetModelCatalog(token))
        } catch (error) {
            logError("Error updating preferred model", error)
            toast.error(error?.response?.data?.message || "Could not update your preferred model")
        }
    }
}

export function UpdatePassword(oldPassword, newPassword, confirmNewPassword, token) {
    return async (dispatch) => {
        const toastId = toast.loading("Updating password...")
        try {
            const response = await apiConnector("PATCH", updatePassword, { oldPassword, newPassword, confirmNewPassword }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Password updated")
        } catch (error) {
            logError("Error updating password", error)
            toast.error(error?.response?.data?.message || "Could not update password")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function DeleteAccount(token, navigate) {
    return async (dispatch) => {
        const toastId = toast.loading("Scheduling account deletion...")
        try {
            const response = await apiConnector("DELETE", deleteAccount, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success(response.data.message)
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error deleting account", error)
            toast.error(error?.response?.data?.message || "Could not delete account")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function RecoverAccount(token) {
    return async (dispatch) => {
        const toastId = toast.loading("Recovering account...")
        try {
            const response = await apiConnector("POST", recoverAccount, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Account recovered")
            dispatch(GetProfile(token))
        } catch (error) {
            logError("Error recovering account", error)
            toast.error(error?.response?.data?.message || "Could not recover account")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
