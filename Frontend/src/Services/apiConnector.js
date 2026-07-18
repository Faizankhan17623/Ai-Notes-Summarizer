import axios from "axios"
import { store } from "../store.js"
import { setToken } from "../Slices/authSlice.js"

// withCredentials so the httpOnly auth cookie flows sir
export const axiosinstance = axios.create({
    withCredentials: true
})

// CSRF token lives in memory only sir — fetched once on app load (and again after login)
// via GET /csrf-token, then echoed back on every state-changing request via this header
let csrfToken = null
export const setCsrfToken = (t) => { csrfToken = t }

axiosinstance.interceptors.request.use((config) => {
    if (csrfToken && config.method?.toLowerCase() !== 'get') {
        config.headers['x-csrf-token'] = csrfToken
    }
    return config
})

// silent refresh sir — the access token now lives only 1 hour (used to be 7 days), so this
// catches the resulting 401, mints a new access token via the httpOnly refresh cookie, and
// retries the original request once. No changes needed in any of the operation files — they
// all flow through this same shared axios instance
let refreshPromise = null

axiosinstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config
        const status = error.response?.status
        const isAuthRoute = original?.url?.includes('/Login') || original?.url?.includes('/refresh-token')

        if (status === 401 && original && !original._retry && !isAuthRoute) {
            original._retry = true
            try {
                if (!refreshPromise) {
                    refreshPromise = axiosinstance
                        .post(`${import.meta.env.VITE_MAIN_BACKEND_URL}/refresh-token`)
                        .finally(() => { refreshPromise = null })
                }
                const refreshRes = await refreshPromise
                const newToken = refreshRes.data.token

                store.dispatch(setToken(newToken))
                localStorage.setItem("token", JSON.stringify(newToken))

                // refresh-token mints a new access-token cookie, and the CSRF token is signed
                // against that cookie's value (see Backend/Middlewares/Csrf.js getSessionIdentifier),
                // so the in-memory csrfToken from before the refresh no longer validates. Re-fetch
                // it here, otherwise every state-changing request after a silent refresh fails with
                // "Invalid or missing CSRF token".
                try {
                    const csrfRes = await axiosinstance.get(`${import.meta.env.VITE_MAIN_BACKEND_URL}/csrf-token`)
                    if (csrfRes.data?.success) setCsrfToken(csrfRes.data.csrfToken)
                } catch (csrfErr) {
                    // non-fatal sir — worst case the next state-changing request 403s and surfaces its own error
                }

                if (original.headers) original.headers.Authorization = `Bearer ${newToken}`
                return axiosinstance(original)
            } catch (refreshErr) {
                store.dispatch(setToken(null))
                localStorage.removeItem("token")
                localStorage.removeItem("user")
                return Promise.reject(error)
            }
        }
        return Promise.reject(error)
    }
)

export const apiConnector = (method, url, bodyData = null, headers = {}, params) => {
    return axiosinstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null
    })
}
