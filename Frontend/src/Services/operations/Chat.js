import toast from "react-hot-toast"
import { apiConnector } from "../apiConnector.js"
import { setAllChats, setCurrentChat, setLoading, setReplying } from "../../Slices/chatSlice.js"
import { ChatData } from "../Apis/ChatApi.js"

const { createChat, allChats, singleChat, sendMessage, deleteChat } = ChatData

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
            console.error("Error creating the chat", error)
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
            console.error("Error fetching the chats", error)
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
            console.error("Error fetching the chat", error)
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
            console.error("Error sending the message", error)
            toast.error(error?.response?.data?.message || "Could not send the message")
            // roll the optimistic bubble back sir
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
            console.error("Error deleting the chat", error)
            toast.error(error?.response?.data?.message || "Could not delete the chat")
        } finally {
            toast.dismiss(toastId)
        }
    }
}
