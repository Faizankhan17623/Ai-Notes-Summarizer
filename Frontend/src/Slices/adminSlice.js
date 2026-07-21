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
    auditLogsTotal: 0,
    auditLogsPage: 1,
    auditLogsPages: 1,
    aiLogs: [],
    aiLogsTotal: 0,
    aiLogsPage: 1,
    aiLogsPages: 1,
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
            state.auditLogs = value.payload.logs
            state.auditLogsTotal = value.payload.total
            state.auditLogsPage = value.payload.page
            state.auditLogsPages = value.payload.pages
        },
        setAiLogs(state, value) {
            state.aiLogs = value.payload.logs
            state.aiLogsTotal = value.payload.total
            state.aiLogsPage = value.payload.page
            state.aiLogsPages = value.payload.pages
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
