import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { showAiErrorToast } from "../../utils/creditErrorToast.jsx"
import { apiConnector } from "../apiConnector.js"
import { setAllChats, setCurrentChat, setLoading, setReplying } from "../../Slices/chatSlice.js"
import { ChatData } from "../Apis/ChatApi.js"

const { createChat, allChats, singleChat, sendMessage, regenerateReply, deleteChat } = ChatData

// start a chat grounded in an already-saved note sir
export function CreateChat(noteId, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Starting chat...")
        try {
            const response = await apiConnector("POST", createChat, { noteId }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Chat started")
            dispatch(GetAllChats(token))
            if (navigate) navigate(`/Dashboard/Chat/${response.data.chatId}`)
        } catch (error) {
            logError("Error creating the chat", error)
            toast.error(error?.response?.data?.message || "Could not start the chat")
        } finally {
            dispatch(setLoading(false))
            toast.dismiss(toastId)
        }
    }
}

export function GetAllChats(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", allChats, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setAllChats(response.data.chats))
        } catch (error) {
            logError("Error fetching the chats", error)
        }
    }
}

export function GetSingleChat(chatId, token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", `${singleChat}/${chatId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentChat(response.data.chat))
        } catch (error) {
            logError("Error fetching the chat", error)
            toast.error(error?.response?.data?.message || "Could not load the chat")
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// send one message sir — the messages are pushed into the open chat optimistically
// so the user's bubble shows instantly while the AI thinks
export function SendMessage(chatId, message, token, currentChat) {
    return async (dispatch) => {
        dispatch(setReplying(true))

        // optimistic user bubble sir
        dispatch(setCurrentChat({
            ...currentChat,
            messages: [...currentChat.messages, { role: 'user', content: message }]
        }))

        try {
            const response = await apiConnector("POST", `${sendMessage}/${chatId}/message`, { message }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentChat({
                ...currentChat,
                messages: [
                    ...currentChat.messages,
                    { role: 'user', content: message },
                    { role: 'assistant', content: response.data.reply }
                ]
            }))
        } catch (error) {
            logError("Error sending the message", error)
            showAiErrorToast(error, "Could not send the message")
            // roll the optimistic bubble back sir
            dispatch(setCurrentChat(currentChat))
        } finally {
            dispatch(setReplying(false))
        }
    }
}

// re-asks the last user message sir — replaces the last assistant reply in place
// rather than appending a duplicate exchange to the conversation
export function RegenerateReply(chatId, token, currentChat) {
    return async (dispatch) => {
        dispatch(setReplying(true))

        // pull the stale reply off immediately sir so the "thinking" indicator
        // takes its place instead of sitting below the old answer
        const messagesWithoutLastReply = currentChat.messages.slice(0, -1)
        dispatch(setCurrentChat({ ...currentChat, messages: messagesWithoutLastReply }))

        try {
            const response = await apiConnector("POST", `${regenerateReply}/${chatId}/regenerate`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setCurrentChat({
                ...currentChat,
                messages: [...messagesWithoutLastReply, { role: 'assistant', content: response.data.reply }]
            }))
        } catch (error) {
            logError("Error regenerating the reply", error)
            showAiErrorToast(error, "Could not regenerate the reply")
            // roll back to the original reply sir
            dispatch(setCurrentChat(currentChat))
        } finally {
            dispatch(setReplying(false))
        }
    }
}

export function DeleteChat(chatId, token, navigate) {
    return async (dispatch) => {
        const toastId = toast.loading("Deleting the chat...")
        try {
            const response = await apiConnector("DELETE", `${deleteChat}/${chatId}`, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            toast.success("Chat deleted")
            dispatch(setCurrentChat(null))
            dispatch(GetAllChats(token))
            if (navigate) navigate("/Dashboard/Chats")
        } catch (error) {
            logError("Error deleting the chat", error)
            toast.error(error?.response?.data?.message || "Could not delete the chat")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
