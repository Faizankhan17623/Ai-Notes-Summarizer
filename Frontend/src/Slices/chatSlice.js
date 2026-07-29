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
        },
        // appends one streamed token to the last message's content sir — used instead of
        // re-dispatching the whole currentChat on every token, which would be wasteful at
        // token granularity (SendMessage/RegenerateReply in operations/Chat.js)
        appendToLastMessage(state, value) {
            const messages = state.currentChat?.messages
            if (!messages || messages.length === 0) return
            messages[messages.length - 1].content += value.payload
        }
    }
})

export const { setAllChats, setCurrentChat, setLoading, setReplying, appendToLastMessage } = chatSlice.actions
export default chatSlice.reducer
