import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { UserData } from "../Apis/UserApi.js"
import { setKeyStatus, setFreshKey, setLoading } from "../../Slices/apiKeySlice.js"

const { apiKey } = UserData

export function GetApiKeyStatus(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", apiKey, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setKeyStatus({
                hasKey: response.data.hasKey,
                createdAt: response.data.createdAt,
                lastUsedAt: response.data.lastUsedAt,
            }))
        } catch (error) {
            console.error("Error fetching API key status", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// generating replaces any existing key sir — the old one stops working immediately
export function GenerateApiKey(token) {
    return async (dispatch) => {
        const toastId = toast.loading("Generating API key...")
        try {
            const response = await apiConnector("POST", apiKey, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setFreshKey(response.data.apiKey))
            dispatch(GetApiKeyStatus(token))
            toast.success("API key generated — copy it now, it won't be shown again")
        } catch (error) {
            console.error("Error generating API key", error)
            toast.error(error?.response?.data?.message || "Could not generate an API key")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function RevokeApiKey(token) {
    return async (dispatch) => {
        const toastId = toast.loading("Revoking API key...")
        try {
            const response = await apiConnector("DELETE", apiKey, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setFreshKey(null))
            dispatch(GetApiKeyStatus(token))
            toast.success("API key revoked")
        } catch (error) {
            console.error("Error revoking API key", error)
            toast.error(error?.response?.data?.message || "Could not revoke the API key")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
