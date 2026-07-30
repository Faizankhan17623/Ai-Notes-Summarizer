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
        },
        // voice-mode Q&A sir — the user's own words aren't known until Whisper transcribes
        // them server-side, so SendVoiceMessage optimistically appends only the empty
        // assistant placeholder first; once the `transcript` SSE event arrives, this splices
        // the real user bubble in just before that trailing placeholder
        insertUserMessage(state, value) {
            const messages = state.currentChat?.messages
            if (!messages || messages.length === 0) return
            messages.splice(messages.length - 1, 0, { role: 'user', content: value.payload })
        }
    }
})

export const { setAllChats, setCurrentChat, setLoading, setReplying, appendToLastMessage, insertUserMessage } = chatSlice.actions
export default chatSlice.reducer
