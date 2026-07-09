import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    // the sidebar list sir
    allChats: [],
    // the open chat with its messages
    currentChat: null,
    loading: false,
    // true while the AI is typing its reply sir
    replying: false
}

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setAllChats(state, value) {
            state.allChats = value.payload
        },
        setCurrentChat(state, value) {
            state.currentChat = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setReplying(state, value) {
            state.replying = value.payload
        }
    }
})

export const { setAllChats, setCurrentChat, setLoading, setReplying } = chatSlice.actions
export default chatSlice.reducer
