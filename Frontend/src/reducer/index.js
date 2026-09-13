import { combineReducers } from "redux"
import authReducer from '../Slices/authSlice'
import notesReducer from '../Slices/notesSlice'
import chatReducer from '../Slices/chatSlice'
import studyKitReducer from '../Slices/studyKitSlice'
import paymentReducer from '../Slices/paymentSlice'
import profileReducer from '../Slices/profileSlice'
import adminReducer from '../Slices/adminSlice'
import apiKeyReducer from '../Slices/apiKeySlice'
import analyticsReducer from '../Slices/analyticsSlice'
import notificationReducer from '../Slices/notificationSlice'
import searchReducer from '../Slices/searchSlice'

const appReducer = combineReducers({
    auth: authReducer,
    notes: notesReducer,
    chat: chatReducer,
    studyKit: studyKitReducer,
    payment: paymentReducer,
    profile: profileReducer,
    admin: adminReducer,
    apiKey: apiKeyReducer,
    analytics: analyticsReducer,
    notification: notificationReducer,
    search: searchReducer,
})

// LogoutUser (Services/operations/Auth.js) dispatches this sir — every slice here holds data
// scoped to the logged-in user (notes, chats, payment history, admin lists, etc). The SPA
// never does a full page reload on logout, so without this the Redux store would keep the
// previous user's data mounted and visible to whoever logs in next in the same tab. Resetting
// state to undefined makes every slice reinitialize to its own initialState, same effect as a
// fresh page load would have had.
const rootReducers = (state, action) => {
    if (action.type === 'auth/logoutReset') {
        state = undefined
    }
    return appReducer(state, action)
}

export default rootReducers
