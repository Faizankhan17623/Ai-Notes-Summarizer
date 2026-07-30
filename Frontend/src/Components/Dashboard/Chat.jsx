import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AnimatePresence, motion } from 'motion/react'
import { FaPaperPlane, FaTrash, FaComments, FaRedo, FaLayerGroup, FaTimes, FaHeadphones } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetAllChats, GetSingleChat, SendMessage, SendVoiceMessage, RegenerateReply, DeleteChat, CreateChat } from '../../Services/operations/Chat.js'
import { GetAllNotes } from '../../Services/operations/Notes.js'
import MicButton from '../extra/MicButton.jsx'
import VoiceRecordButton from '../extra/VoiceRecordButton.jsx'
import useAudioPlayback from '../../Hooks/useAudioPlayback.js'

// the model sometimes answers in markdown (### headings, **bold**, `code`) sir — the chat
// bubble is plain text, not a markdown renderer, so strip the syntax rather than show it raw
const stripMarkdown = (text) =>
    text
        .replace(/^#{1,6}\s+/gm, '')      // ### Heading -> Heading
        .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** -> bold
        .replace(/\*(.+?)\*/g, '$1')      // *italic* -> italic
        .replace(/`(.+?)`/g, '$1')        // `code` -> code

const Chat = () => {
    const { chatId } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const { allChats, currentChat, loading, replying } = useSelector((state) => state.chat)
    const { allNotes } = useSelector((state) => state.notes)
    const [message, setMessage] = useState('')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickedIds, setPickedIds] = useState(new Set())
    const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem('notewise_voiceMode') === '1')
    const bottomRef = useRef(null)
    const { playing, play, stop: stopPlayback } = useAudioPlayback()

    useEffect(() => {
        dispatch(GetAllChats(token))
        dispatch(GetAllNotes(token))
    }, [dispatch, token])

    useEffect(() => {
        if (chatId) dispatch(GetSingleChat(chatId, token))
    }, [dispatch, chatId, token])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [currentChat?.messages?.length])

    const handleTranscript = useCallback((transcript) => {
        setMessage(transcript)
    }, [])

    const handleSend = (e) => {
        e.preventDefault()
        if (!message.trim() || !chatId) return
        dispatch(SendMessage(chatId, message.trim(), token, currentChat))
        setMessage('')
    }

    const toggleVoiceMode = () => {
        setVoiceMode((prev) => {
            const next = !prev
            localStorage.setItem('notewise_voiceMode', next ? '1' : '0')
            if (!next) stopPlayback()
            return next
        })
    }

    // barge-in sir — starting a new recording stops any reply still being spoken
    const handleVoiceRecorded = useCallback((blob) => {
        if (!chatId) return
        stopPlayback()
        dispatch(SendVoiceMessage(chatId, blob, token, currentChat, (audio, mimeType) => play(audio, mimeType)))
    }, [chatId, token, currentChat, dispatch, play, stopPlayback])

    const handleRegenerate = () => {
        if (!chatId || replying) return
        dispatch(RegenerateReply(chatId, token, currentChat))
    }

    const togglePicked = (noteId) => {
        setPickedIds((prev) => {
            const next = new Set(prev)
            if (next.has(noteId)) next.delete(noteId)
            else if (next.size < 10) next.add(noteId)
            return next
        })
    }

    const handleStartMultiChat = () => {
        if (pickedIds.size < 2) return
        dispatch(CreateChat([...pickedIds], token, navigate))
        setPickerOpen(false)
        setPickedIds(new Set())
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete this chat?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(DeleteChat(id, token, navigate))
        }
    }

    return (
        <>
            <Helmet><title>Chat — Notewise</title></Helmet>

            <div className="flex h-[calc(100vh-73px)]">
                {/* chat list sir */}
                <aside className="w-72 shrink-0 border-r border-border-soft bg-surface-raised flex flex-col">
                    <div className="px-5 py-5 border-b border-border-soft">
                        <div className="flex items-center justify-between">
                            <h1 className="font-display text-lg font-semibold text-richblack-5">Your chats</h1>
                            <button
                                type="button"
                                onClick={() => setPickerOpen((v) => !v)}
                                title="Chat across multiple notes"
                                className="text-richblack-400 hover:text-yellow-50 transition-colors"
                            >
                                {pickerOpen ? <FaTimes size={14} /> : <FaLayerGroup size={14} />}
                            </button>
                        </div>
                        <p className="text-richblack-400 text-xs mt-1">
                            {pickerOpen ? 'Pick 2-10 notes to chat across' : "Start one from any note's summary page"}
                        </p>
                    </div>

                    {pickerOpen && (
                        <div className="border-b border-border-soft px-3 py-3">
                            <div className="max-h-52 overflow-y-auto space-y-0.5">
                                {allNotes.map((note) => (
                                    <label key={note._id} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-surface-hover">
                                        <input
                                            type="checkbox"
                                            checked={pickedIds.has(note._id)}
                                            onChange={() => togglePicked(note._id)}
                                            className="accent-yellow-50"
                                        />
                                        <span className="text-richblack-200 truncate">{note.title}</span>
                                    </label>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleStartMultiChat}
                                disabled={pickedIds.size < 2}
                                className="w-full mt-2 bg-yellow-50 text-richblack-900 rounded-md py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                            >
                                Start chat ({pickedIds.size} notes)
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto py-2">
                        {allChats.length === 0 ? (
                            <div className="px-5 py-8 text-center">
                                <FaComments className="text-richblack-600 text-2xl mx-auto mb-3" />
                                <p className="text-richblack-400 text-sm">No chats yet</p>
                            </div>
                        ) : (
                            allChats.map((c) => (
                                <div
                                    key={c._id}
                                    className={`group flex items-center justify-between mx-2 rounded-md px-3 py-2.5 transition-colors ${c._id === chatId ? "bg-yellow-50/10" : "hover:bg-surface-hover"}`}
                                >
                                    <Link
                                        to={`/Dashboard/Chat/${c._id}`}
                                        className={`text-sm truncate flex-1 ${c._id === chatId ? "text-richblack-5 font-medium" : "text-richblack-200"}`}
                                    >
                                        {c.title}
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(c._id)}
                                        title="Delete chat"
                                        aria-label="Delete chat"
                                        className="text-richblack-500 hover:text-pink-200 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* conversation sir */}
                <div className="flex-1 flex flex-col min-w-0">
                    {!chatId ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <FaComments className="text-richblack-700 text-4xl mx-auto mb-4" />
                                <p className="text-richblack-300 text-sm">Select a chat from the list to continue the conversation</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                                <AnimatePresence initial={false}>
                                    {currentChat?.messages?.map((m, i) => {
                                        const isLastMessage = i === currentChat.messages.length - 1
                                        const isLastAssistantReply = m.role === 'assistant' && isLastMessage
                                        // empty placeholder sir — streaming hasn't produced its first token yet,
                                        // show the typing dots in its place instead of a blank bubble
                                        if (isLastAssistantReply && replying && !m.content) {
                                            return (
                                                <motion.div
                                                    key="typing-indicator"
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex justify-start"
                                                >
                                                    <div className="bg-surface border border-border-soft text-richblack-400 rounded-lg px-4 py-2.5 text-sm flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-richblack-400 animate-pulse" />
                                                        <span className="w-1.5 h-1.5 rounded-full bg-richblack-400 animate-pulse [animation-delay:150ms]" />
                                                        <span className="w-1.5 h-1.5 rounded-full bg-richblack-400 animate-pulse [animation-delay:300ms]" />
                                                    </div>
                                                </motion.div>
                                            )
                                        }
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[70%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                                        ? 'bg-yellow-50 text-richblack-900'
                                                        : 'bg-surface border border-border-soft text-richblack-100'
                                                        }`}
                                                >
                                                    {m.role === 'assistant' ? stripMarkdown(m.content) : m.content}
                                                </div>
                                                {isLastAssistantReply && !replying && (
                                                    <button
                                                        onClick={handleRegenerate}
                                                        title="Regenerate this reply"
                                                        className="flex items-center gap-1.5 text-richblack-500 hover:text-richblack-200 text-xs mt-1.5 cursor-pointer transition-colors"
                                                    >
                                                        <FaRedo size={10} /> Regenerate
                                                    </button>
                                                )}
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                                <div ref={bottomRef} />
                            </div>

                            <div className="flex items-center justify-between px-6 pt-3 border-t border-border-soft bg-surface-raised">
                                <button
                                    type="button"
                                    onClick={toggleVoiceMode}
                                    title={voiceMode ? "Switch back to typing" : "Switch to voice mode — speak your question and hear the answer"}
                                    className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${voiceMode ? "text-yellow-50" : "text-richblack-400 hover:text-richblack-200"}`}
                                >
                                    <FaHeadphones size={12} />
                                    Voice mode {voiceMode ? "on" : "off"}
                                </button>
                                {playing && (
                                    <span className="text-xs text-richblack-400 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-50 animate-pulse" />
                                        Speaking...
                                    </span>
                                )}
                            </div>

                            {voiceMode ? (
                                <div className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-raised">
                                    <VoiceRecordButton onRecorded={handleVoiceRecorded} disabled={replying} />
                                </div>
                            ) : (
                                <form onSubmit={handleSend} className="flex items-center gap-2 px-6 py-4 bg-surface-raised">
                                    <input
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Ask something about your notes..."
                                        className="flex-1 bg-surface border border-border-soft text-richblack-5 rounded-md px-4 py-2.5 outline-none focus:border-yellow-50 transition-colors"
                                    />
                                    <MicButton onTranscript={handleTranscript} />
                                    <motion.button
                                        type="submit"
                                        whileTap={{ scale: 0.9 }}
                                        disabled={replying || !message.trim()}
                                        className="bg-yellow-50 text-richblack-900 rounded-md p-2.5 disabled:opacity-50 cursor-pointer hover:scale-95 transition-all"
                                    >
                                        <FaPaperPlane />
                                    </motion.button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default Chat
