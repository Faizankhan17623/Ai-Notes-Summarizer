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
    // saved filter views sir — keyed by page ('users'|'payments'|'audit'|'ai-logs') so each
    // admin list page only ever sees its own saved views, never another page's
    savedViews: {},
    // per-ticket user activity sir — keyed by messageId, populated on demand when a
    // ContactMessages card is expanded to look up its submitter's AI activity
    ticketActivity: {},
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
        setSavedViews(state, value) {
            state.savedViews[value.payload.page] = value.payload.views
        },
        setTicketActivity(state, value) {
            state.ticketActivity[value.payload.messageId] = value.payload.activity
        },
        setLoading(state, value) {
            state.loading = value.payload
        }
    }
})

export const {
    setOverview, setAnalytics, setTraffic, setTrafficLoading, setUsers, setPayments, setAuditLogs, setAiLogs,
    setAnnouncements, setContactMessages, setSavedViews, setTicketActivity, setLoading,
} = adminSlice.actions
export default adminSlice.reducer
