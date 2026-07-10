import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaTrash, FaThumbtack } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetAllNotes, GetTagsAndFolders, OrganizeNote, DeleteNote } from '../../Services/operations/Notes.js'
import Loading from '../extra/Loading.jsx'

const History = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { allNotes, tags, folders, loading } = useSelector((state) => state.notes)
    const [search, setSearch] = useState('')
    const [tag, setTag] = useState('')
    const [folder, setFolder] = useState('')
    const [pinnedOnly, setPinnedOnly] = useState(false)

    useEffect(() => {
        dispatch(GetTagsAndFolders(token))
    }, [dispatch, token])

    // debounced sir — search hits the backend's full-text index, no point firing on every keystroke
    useEffect(() => {
        const handle = setTimeout(() => {
            const filters = {}
            if (search.trim()) filters.search = search.trim()
            if (tag) filters.tag = tag
            if (folder) filters.folder = folder
            if (pinnedOnly) filters.pinned = true
            dispatch(GetAllNotes(token, filters))
        }, 300)
        return () => clearTimeout(handle)
    }, [dispatch, token, search, tag, folder, pinnedOnly])

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

    const togglePin = (e, note) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(OrganizeNote(note._id, { pinned: !note.pinned }, token))
        // optimistic-ish sir — the next GetAllNotes call (on any filter change) will reconcile anyway
        dispatch(GetAllNotes(token, { search: search.trim() || undefined, tag: tag || undefined, folder: folder || undefined, pinned: pinnedOnly || undefined }))
    }

    return (
        <>
            <Helmet><title>History — AI Notes Summarizer</title></Helmet>

            <div className="max-w-3xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Your notes</h1>

                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your notes' content..."
                    className="w-full bg-richblack-800 border border-richblack-700 text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50 mb-3"
                />

                <div className="flex flex-wrap gap-2 mb-6">
                    <select value={tag} onChange={(e) => setTag(e.target.value)} className="bg-richblack-800 border border-richblack-700 text-richblack-200 text-sm rounded-md px-3 py-1.5">
                        <option value="">All tags</option>
                        {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={folder} onChange={(e) => setFolder(e.target.value)} className="bg-richblack-800 border border-richblack-700 text-richblack-200 text-sm rounded-md px-3 py-1.5">
                        <option value="">All folders</option>
                        {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button
                        onClick={() => setPinnedOnly((p) => !p)}
                        className={`flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 cursor-pointer ${pinnedOnly ? "bg-yellow-50 text-richblack-900" : "bg-richblack-800 text-richblack-200 border border-richblack-700"}`}
                    >
                        <FaThumbtack size={11} /> Pinned only
                    </button>
                </div>

                {loading ? (
                    <Loading text="Loading notes..." />
                ) : allNotes.length === 0 ? (
                    <p className="text-richblack-400 text-sm">No notes found.</p>
                ) : (
                    <div className="space-y-3">
                        {allNotes.map((note) => (
                            <Link key={note._id} to={`/Dashboard/Note/${note._id}`} className="flex items-center justify-between border border-border-soft bg-surface rounded-md p-4 hover:border-yellow-50 transition-all">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-richblack-5 font-medium">{note.title}</p>
                                        {note.pinned && <FaThumbtack size={11} className="text-yellow-50" />}
                                    </div>
                                    <p className="text-richblack-400 text-xs mt-1">
                                        {new Date(note.createdAt).toLocaleString()} · {note.sourceType} · {note.plan}
                                        {note.folder && ` · ${note.folder}`}
                                    </p>
                                    {note.tags?.length > 0 && (
                                        <div className="flex gap-1 mt-1.5">
                                            {note.tags.map((t) => (
                                                <span key={t} className="text-xs bg-richblack-700 text-richblack-200 px-2 py-0.5 rounded">{t}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => togglePin(e, note)} title={note.pinned ? "Unpin" : "Pin"} className={`p-2 cursor-pointer ${note.pinned ? "text-yellow-50" : "text-richblack-400 hover:text-yellow-50"}`}>
                                        <FaThumbtack />
                                    </button>
                                    <button onClick={(e) => handleDelete(e, note._id)} className="text-richblack-400 hover:text-pink-200 p-2 cursor-pointer">
                                        <FaTrash />
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

export default History
