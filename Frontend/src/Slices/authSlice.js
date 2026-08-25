import { createSlice } from "@reduxjs/toolkit"

// no localStorage read here anymore sir — the access token now lives ONLY in memory (this
// Redux state) and the httpOnly cookie, never in a place an XSS bug could read it back out
// after the fact. Session state on a fresh page load is restored by RestoreSession
// (Services/operations/Auth.js), called once from App.jsx, using the cookie alone.
const initialState = {
    user: null,
    token: null,
    isLoggedIn: false,
    // true until RestoreSession's one-shot check on app load resolves sir — route guards
    // (PrivateRoute etc.) use this to avoid bouncing a genuinely logged-in user to /Login
    // just because the in-memory token hasn't been restored from the cookie yet
    sessionChecked: false,
    loading: false,
    // the email waiting on the OTP screen sir
    signupData: null
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser(state, value) {
            state.user = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setToken(state, value) {
            state.token = value.payload
        },
        setLogin(state, value) {
            state.isLoggedIn = value.payload
        },
        setSignupData(state, value) {
            state.signupData = value.payload
        },
        setSessionChecked(state, value) {
            state.sessionChecked = value.payload
        }
    }
})

export const { setUser, setLoading, setToken, setLogin, setSignupData, setSessionChecked } = authSlice.actions
export default authSlice.reducer
