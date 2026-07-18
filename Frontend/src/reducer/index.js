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

const rootReducers = combineReducers({
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
})

export default rootReducers
