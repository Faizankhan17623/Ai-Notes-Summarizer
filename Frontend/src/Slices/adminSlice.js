import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    overview: null,
    analytics: null,
    traffic: null,
    trafficLoading: false,
    users: [],
    usersTotal: 0,
    usersPage: 1,
    usersPages: 1,
    payments: [],
    auditLogs: [],
    aiLogs: [],
    announcements: [],
    contactMessages: [],
    loading: false
}

const adminSlice = createSlice({
    name: "admin",
    initialState,
    reducers: {
        setOverview(state, value) {
            state.overview = value.payload
        },
        setAnalytics(state, value) {
            state.analytics = value.payload
        },
        setTraffic(state, value) {
            state.traffic = value.payload
        },
        setTrafficLoading(state, value) {
            state.trafficLoading = value.payload
        },
        setUsers(state, value) {
            state.users = value.payload.users
            state.usersTotal = value.payload.total
            state.usersPage = value.payload.page
            state.usersPages = value.payload.pages
        },
        setPayments(state, value) {
            state.payments = value.payload
        },
        setAuditLogs(state, value) {
            state.auditLogs = value.payload
        },
        setAiLogs(state, value) {
            state.aiLogs = value.payload
        },
        setAnnouncements(state, value) {
            state.announcements = value.payload
        },
        setContactMessages(state, value) {
            state.contactMessages = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const { setOverview, setAnalytics, setTraffic, setTrafficLoading, setUsers, setPayments, setAuditLogs, setAiLogs, setAnnouncements, setContactMessages, setLoading } = adminSlice.actions
export default adminSlice.reducer
