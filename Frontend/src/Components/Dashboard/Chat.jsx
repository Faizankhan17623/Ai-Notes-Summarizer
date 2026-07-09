import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaPaperPlane, FaTrash } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetAllChats, GetSingleChat, SendMessage, DeleteChat } from '../../Services/operations/Chat.js'
import Navbar from '../Home/Navbar.jsx'
import Loading from '../extra/Loading.jsx'
import MicButton from '../extra/MicButton.jsx'

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

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete this chat?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: '#161D29',
            color: '#F1F2FF',
        })
        if (result.isConfirmed) {
            dispatch(DeleteChat(id, token, navigate))
        }
    }

    return (
        <div className="min-h-screen bg-richblack-900 flex flex-col">
            <Helmet><title>Chat — AI Notes Summarizer</title></Helmet>
            <Navbar />

            <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-8 gap-6">
                {/* sidebar sir */}
                <div className="w-64 shrink-0 border-r border-richblack-700 pr-4">
                    <h2 className="text-richblack-5 font-semibold mb-4">Your chats</h2>
                    <div className="space-y-2">
                        {allChats.map((c) => (
                            <div key={c._id} className={`flex items-center justify-between rounded-md p-2 ${c._id === chatId ? "bg-richblack-800" : ""}`}>
                                <Link to={`/Dashboard/Chat/${c._id}`} className="text-sm text-richblack-200 hover:text-richblack-5 truncate flex-1">
                                    {c.title}
                                </Link>
                                <button onClick={() => handleDelete(c._id)} className="text-richblack-500 hover:text-pink-200 cursor-pointer">
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))}
                        {allChats.length === 0 && <p className="text-richblack-400 text-xs">No chats yet — start one from a note's summary page.</p>}
                    </div>
                </div>

                {/* conversation sir */}
                <div className="flex-1 flex flex-col">
                    {!chatId || loading ? (
                        <Loading text={chatId ? "Loading chat..." : "Select a chat to begin"} />
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[60vh]">
                                {currentChat?.messages?.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-yellow-50 text-richblack-900' : 'bg-richblack-800 text-richblack-100'}`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {replying && (
                                    <div className="flex justify-start">
                                        <div className="bg-richblack-800 text-richblack-400 rounded-lg px-4 py-2 text-sm">Thinking...</div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            <form onSubmit={handleSend} className="flex items-center gap-2">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask something about your notes..."
                                    className="flex-1 bg-richblack-800 border border-richblack-700 text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50"
                                />
                                <MicButton onTranscript={handleTranscript} />
                                <button type="submit" disabled={replying || !message.trim()} className="bg-yellow-50 text-richblack-900 rounded-md p-2.5 disabled:opacity-50 cursor-pointer">
                                    <FaPaperPlane />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Chat
