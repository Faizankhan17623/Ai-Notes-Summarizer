import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { FaLink, FaTimes, FaPlus } from 'react-icons/fa'
import { AddNoteLink, RemoveNoteLink } from '../../Services/operations/Notes.js'

// manual backlinks sir — separate from RelatedNotes (which is tag-overlap, read-only).
// This is the user deliberately connecting two notes, symmetric on both ends.
const LinkedNotes = ({ note }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { allNotes } = useSelector((state) => state.notes)
    const [query, setQuery] = useState('')
    const [adding, setAdding] = useState(false)

    if (!note) return null

    const linkedIds = new Set((note.linkedNotes || []).map((n) => n._id || n))
    const candidates = query.trim()
        ? allNotes
            .filter((n) => n._id !== note._id && !linkedIds.has(n._id))
            .filter((n) => n.title?.toLowerCase().includes(query.trim().toLowerCase()))
            .slice(0, 6)
        : []

    const handleAdd = async (targetId) => {
        setQuery('')
        await dispatch(AddNoteLink(note._id, targetId, token))
    }

    const handleRemove = async (targetId) => {
        await dispatch(RemoveNoteLink(note._id, targetId, token))
    }

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold">Linked notes</p>
                <button
                    type="button"
                    onClick={() => setAdding((v) => !v)}
                    className="text-richblack-400 hover:text-yellow-50 transition-colors"
                    title="Link another note"
                >
                    {adding ? <FaTimes size={12} /> : <FaPlus size={12} />}
                </button>
            </div>

            {adding && (
                <div className="mb-4 relative">
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your notes..."
                        className="w-full bg-surface-raised border border-border-soft rounded-md px-3 py-2 text-sm text-richblack-100 placeholder:text-richblack-500 focus:outline-none focus:border-yellow-50"
                    />
                    {candidates.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-surface-raised border border-border-soft rounded-md shadow-lg overflow-hidden">
                            {candidates.map((n) => (
                                <li key={n._id}>
                                    <button
                                        type="button"
                                        onClick={() => handleAdd(n._id)}
                                        className="w-full text-left px-3 py-2 text-sm text-richblack-100 hover:bg-surface truncate"
                                    >
                                        {n.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {!note.linkedNotes?.length ? (
                <p className="text-richblack-500 text-sm">No notes linked yet.</p>
            ) : (
                <ul className="space-y-3">
                    {note.linkedNotes.map((linked) => (
                        <li key={linked._id} className="flex items-start gap-2.5 group">
                            <FaLink className="text-richblack-500 group-hover:text-yellow-50 mt-0.5 shrink-0 transition-colors" size={12} />
                            <Link to={`/Dashboard/Note/${linked._id}`} className="min-w-0 flex-1">
                                <p className="text-richblack-100 group-hover:text-yellow-50 text-sm truncate transition-colors">
                                    {linked.title}
                                </p>
                            </Link>
                            <button
                                type="button"
                                onClick={() => handleRemove(linked._id)}
                                className="text-richblack-600 hover:text-pink-200 transition-colors shrink-0"
                                title="Remove link"
                            >
                                <FaTimes size={11} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default LinkedNotes
