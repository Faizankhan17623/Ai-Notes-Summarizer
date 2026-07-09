import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaTrash } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetAllNotes, DeleteNote } from '../../Services/operations/Notes.js'
import Navbar from '../Home/Navbar.jsx'
import Loading from '../extra/Loading.jsx'

const History = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { allNotes, loading } = useSelector((state) => state.notes)
    const [search, setSearch] = useState('')

    useEffect(() => {
        dispatch(GetAllNotes(token))
    }, [dispatch, token])

    const filtered = allNotes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))

    const handleDelete = async (e, noteId) => {
        e.preventDefault()
        e.stopPropagation()
        const result = await Swal.fire({
            title: 'Delete this note?',
            text: 'This also deletes any chats grounded in it.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: '#161D29',
            color: '#F1F2FF',
        })
        if (result.isConfirmed) {
            dispatch(DeleteNote(noteId, token))
        }
    }

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>History — AI Notes Summarizer</title></Helmet>
            <Navbar />

            <div className="max-w-3xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Your notes</h1>

                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title..."
                    className="w-full bg-richblack-800 border border-richblack-700 text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50 mb-6"
                />

                {loading ? (
                    <Loading text="Loading notes..." />
                ) : filtered.length === 0 ? (
                    <p className="text-richblack-400 text-sm">No notes found.</p>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((note) => (
                            <Link key={note._id} to={`/Dashboard/Note/${note._id}`} className="flex items-center justify-between border border-richblack-700 rounded-md p-4 hover:border-yellow-50 transition-all">
                                <div>
                                    <p className="text-richblack-5 font-medium">{note.title}</p>
                                    <p className="text-richblack-400 text-xs mt-1">{new Date(note.createdAt).toLocaleString()} · {note.sourceType} · {note.plan}</p>
                                </div>
                                <button onClick={(e) => handleDelete(e, note._id)} className="text-richblack-400 hover:text-pink-200 p-2 cursor-pointer">
                                    <FaTrash />
                                </button>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default History
