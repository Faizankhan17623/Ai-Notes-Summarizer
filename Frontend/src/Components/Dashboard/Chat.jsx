import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AnimatePresence, motion } from 'motion/react'
import { FaPaperPlane, FaTrash, FaComments, FaRedo } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetAllChats, GetSingleChat, SendMessage, RegenerateReply, DeleteChat } from '../../Services/operations/Chat.js'
import MicButton from '../extra/MicButton.jsx'

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
    const [message, setMessage] = useState('')
    const bottomRef = useRef(null)

    useEffect(() => {
        dispatch(GetAllChats(token))
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

    const handleRegenerate = () => {
        if (!chatId || replying) return
        dispatch(RegenerateReply(chatId, token, currentChat))
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
                        <h1 className="font-display text-lg font-semibold text-richblack-5">Your chats</h1>
                        <p className="text-richblack-400 text-xs mt-1">Start one from any note's summary page</p>
                    </div>

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
                                        const isLastAssistantReply = m.role === 'assistant' && i === currentChat.messages.length - 1
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
                                    {replying && (
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
                                    )}
                                </AnimatePresence>
                                <div ref={bottomRef} />
                            </div>

                            <form onSubmit={handleSend} className="flex items-center gap-2 px-6 py-4 border-t border-border-soft bg-surface-raised">
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
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default Chat
