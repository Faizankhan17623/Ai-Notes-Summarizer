import { logError } from "../../utils/logError.js"
import toast from "react-hot-toast"
import { showAiErrorToast } from "../../utils/creditErrorToast.jsx"
import { apiConnector } from "../apiConnector.js"
import { streamChatMessage } from "../streamChat.js"
import { finishReply, setAllChats, setCurrentChat, setLoading, setReplying, appendToLastMessage, insertUserMessage } from "../../Slices/chatSlice.js"
import { store } from "../../store.js"
import { ChatData } from "../Apis/ChatApi.js"

const { createChat, allChats, singleChat, sendMessageStream, regenerateReplyStream, sendVoiceMessageStream, deleteChat } = ChatData

// guards the stream-completion dispatches below sir — if the user has already navigated to a
// DIFFERENT chat by the time a stream finishes/errors, blindly dispatching setReplying(false)
// or rolling back to this stream's `currentChat` snapshot would stomp on whatever chat is now
// actually on screen (e.g. clearing ITS "replying" spinner mid-stream, or reverting its
// messages). Only act if the chat this stream belongs to is still the one open.
const isStillCurrentChat = (chatId) => store.getState().chat.currentChat?._id === chatId

const rollbackIfStillCurrent = (dispatch, chatId, snapshot) => {
    if (isStillCurrentChat(chatId)) dispatch(setCurrentChat(snapshot))
}

const stopReplyingIfStillCurrent = (dispatch, chatId) => {
    if (isStillCurrentChat(chatId)) dispatch(setReplying(false))
}

// start a chat grounded in an already-saved note sir. Pass either a single noteId (string,
// original behavior) or an array of noteIds (2-10, cross-note chat) — same endpoint either way
export function CreateChat(noteIdOrIds, token, navigate) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        const toastId = toast.loading("Starting chat...")
        try {
            const payload = Array.isArray(noteIdOrIds) ? { noteIds: noteIdOrIds } : { noteId: noteIdOrIds }
            const response = await apiConnector("POST", createChat, payload, {
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

// send one message sir — the user's bubble shows instantly (optimistic), then an empty
// assistant placeholder is appended and grown token-by-token as the SSE stream arrives
export function SendMessage(chatId, message, token, currentChat) {
    return async (dispatch) => {
        dispatch(setReplying(true))

        // optimistic user bubble + empty assistant placeholder sir, filled in as tokens stream
        dispatch(setCurrentChat({
            ...currentChat,
            messages: [
                ...currentChat.messages,
                { role: 'user', content: message },
                { role: 'assistant', content: '' },
            ]
        }))

        await streamChatMessage({
            url: `${sendMessageStream}/${chatId}/message/stream`,
            body: { message },
            token,
            onToken: (chunk) => dispatch(appendToLastMessage({ chatId, chunk })),
            onDone: (reply, citations) => dispatch(finishReply({ chatId, reply, citations })),
            onError: (error) => {
                logError("Error sending the message", error)
                showAiErrorToast(error, "Could not send the message")
                // roll the optimistic bubble + placeholder back sir — but only if the user
                // hasn't already switched to a different chat while this was in flight
                rollbackIfStillCurrent(dispatch, chatId, currentChat)
                stopReplyingIfStillCurrent(dispatch, chatId)
            },
        })
    }
}

// voice-mode Q&A sir — sends a recorded audio blob instead of typed text. The transcript
// isn't known client-side until Whisper decodes it server-side, so only the empty assistant
// placeholder is appended optimistically; the real user bubble is spliced in once the
// `transcript` SSE event arrives. `onReplyDone` gets the final reply text so the caller can
// speak it aloud via browser speechSynthesis (see useTextToSpeech) once streaming finishes.
export function SendVoiceMessage(chatId, audioBlob, token, currentChat, onReplyDone) {
    return async (dispatch) => {
        dispatch(setReplying(true))

        dispatch(setCurrentChat({
            ...currentChat,
            messages: [
                ...currentChat.messages,
                { role: 'assistant', content: '' },
            ]
        }))

        const formData = new FormData()
        formData.append('audio', audioBlob, 'voice-message.webm')

        await streamChatMessage({
            url: `${sendVoiceMessageStream}/${chatId}/message/voice`,
            body: formData,
            token,
            onTranscript: (text) => dispatch(insertUserMessage({ chatId, text })),
            onToken: (chunk) => dispatch(appendToLastMessage({ chatId, chunk })),
            onDone: (reply, citations) => {
                dispatch(finishReply({ chatId, reply, citations }))
                stopReplyingIfStillCurrent(dispatch, chatId)
                onReplyDone?.(reply)
            },
            onError: (error) => {
                logError("Error sending the voice message", error)
                showAiErrorToast(error, "Could not send the voice message")
                // roll the optimistic placeholder back sir — but only if the user hasn't
                // already switched to a different chat while this was in flight
                rollbackIfStillCurrent(dispatch, chatId, currentChat)
                stopReplyingIfStillCurrent(dispatch, chatId)
            },
        })
    }
}

// re-asks the last user message sir — replaces the last assistant reply in place,
// streamed token-by-token exactly like SendMessage
export function RegenerateReply(chatId, token, currentChat) {
    return async (dispatch) => {
        dispatch(setReplying(true))

        // pull the stale reply off immediately sir and drop in an empty placeholder so the
        // "thinking" indicator takes its place instead of sitting below the old answer
        const messagesWithoutLastReply = currentChat.messages.slice(0, -1)
        dispatch(setCurrentChat({
            ...currentChat,
            messages: [...messagesWithoutLastReply, { role: 'assistant', content: '' }]
        }))

        await streamChatMessage({
            url: `${regenerateReplyStream}/${chatId}/regenerate/stream`,
            body: null,
            token,
            onToken: (chunk) => dispatch(appendToLastMessage({ chatId, chunk })),
            onDone: () => stopReplyingIfStillCurrent(dispatch, chatId),
            onError: (error) => {
                logError("Error regenerating the reply", error)
                showAiErrorToast(error, "Could not regenerate the reply")
                // roll back to the original reply sir — but only if the user hasn't already
                // switched to a different chat while this was in flight
                rollbackIfStillCurrent(dispatch, chatId, currentChat)
                stopReplyingIfStillCurrent(dispatch, chatId)
            },
        })
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
