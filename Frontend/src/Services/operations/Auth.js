import toast from "react-hot-toast"
import { apiConnector, setCsrfToken } from "../apiConnector.js"
import { UserData } from "../Apis/UserApi.js"
import { setLoading, setToken, setUser, setLogin, setSignupData } from "../../Slices/authSlice.js"
import { setProfile, setPlan, setActivity, setModelCatalog } from "../../Slices/profileSlice.js"

const { sendOtp, createUser, login, forgotPassword, resetPassword, profile, updateFirstName, updateLastName, updateDigestPreference, updateDailyGoal, modelCatalog, updateModel, updatePassword, deleteAccount, recoverAccount, logout, csrfToken } = UserData

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
            console.error("Error fetching CSRF token", error)
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
            console.error("Error sending OTP", error)
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
            console.error("Error creating account", error)
            toast.error(error?.response?.data?.message || "Could not create account")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
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
            dispatch(setToken(response.data.token))
            dispatch(setUser(response.data.user))
            dispatch(setLogin(true))
            localStorage.setItem("token", JSON.stringify(response.data.token))
            localStorage.setItem("user", JSON.stringify(response.data.user))
            // the CSRF secret cookie is freshly (re)set on login sir — refresh the in-memory token to match
            dispatch(FetchCsrfToken())
            // each role lands on its own separate dashboard sir, never another role's
            // (PrivateRoute/AdminRoute/SupportRoute enforce this too, this just skips the redirect flash)
            const role = response.data.user?.role
            const landingPath = role === 'Admin' ? '/Admin' : role === 'Support' ? '/Support' : '/Dashboard'
            if (navigate) navigate(landingPath)
        } catch (error) {
            console.error("Error logging in", error)
            toast.error(error?.response?.data?.message || "Could not log in")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function LogoutUser(navigate) {
    return async (dispatch) => {
        try {
            await apiConnector("POST", logout)
        } catch (error) {
            // best-effort sir — clear local state regardless, the access token will simply expire on its own
            console.error("Error logging out on the server", error)
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
        try {
            const response = await apiConnector("POST", forgotPassword, { email })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Reset link sent to your email")
        } catch (error) {
            console.error("Error sending reset link", error)
            toast.error(error?.response?.data?.message || "Could not send reset link")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
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
            console.error("Error resetting password", error)
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
        } catch (error) {
            console.error("Error fetching profile", error)
        } finally {
            dispatch(setLoading(false))
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
            console.error("Error updating first name", error)
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
            console.error("Error updating last name", error)
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
            console.error("Error updating digest preference", error)
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
            console.error("Error updating daily goal", error)
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
            console.error("Error fetching model catalog", error)
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
            console.error("Error updating preferred model", error)
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
            console.error("Error updating password", error)
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
            console.error("Error deleting account", error)
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
            console.error("Error recovering account", error)
            toast.error(error?.response?.data?.message || "Could not recover account")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
