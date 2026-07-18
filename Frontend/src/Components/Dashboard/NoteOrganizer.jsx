import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaThumbtack, FaTimes, FaStar } from 'react-icons/fa'
import { OrganizeNote } from '../../Services/operations/Notes.js'

// tags/folder/pin editing sir — lives in the Report page's right rail
const NoteOrganizer = ({ note }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const [tagInput, setTagInput] = useState('')
    const [folder, setFolder] = useState(note.folder || '')

    const addTag = (e) => {
        e.preventDefault()
        const value = tagInput.trim()
        if (!value || note.tags?.includes(value)) return
        dispatch(OrganizeNote(note._id, { tags: [...(note.tags || []), value] }, token))
        setTagInput('')
    }

    const removeTag = (tag) => {
        dispatch(OrganizeNote(note._id, { tags: (note.tags || []).filter((t) => t !== tag) }, token))
    }

    const saveFolder = () => {
        if (folder === (note.folder || '')) return
        dispatch(OrganizeNote(note._id, { folder: folder.trim() || null }, token))
    }

    const togglePin = () => {
        dispatch(OrganizeNote(note._id, { pinned: !note.pinned }, token))
    }

    const toggleFavorite = () => {
        dispatch(OrganizeNote(note._id, { favorite: !note.favorite }, token))
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={togglePin}
                    className={`flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-1.5 cursor-pointer flex-1 transition-colors ${note.pinned ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-300 border border-border-soft hover:border-yellow-50"}`}
                >
                    <FaThumbtack size={10} /> {note.pinned ? "Pinned" : "Pin"}
                </button>
                <button
                    onClick={toggleFavorite}
                    className={`flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-1.5 cursor-pointer flex-1 transition-colors ${note.favorite ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-300 border border-border-soft hover:border-yellow-50"}`}
                >
                    <FaStar size={10} /> {note.favorite ? "Favorited" : "Favorite"}
                </button>
            </div>

            <div>
                <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1.5">Folder</p>
                <input
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    onBlur={saveFolder}
                    placeholder="None"
                    className="w-full bg-surface-hover border border-border-soft text-richblack-200 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50"
                />
            </div>

            <div>
                <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {(note.tags || []).map((tag) => (
                        <span key={tag} className="flex items-center gap-1 text-xs bg-surface-hover text-richblack-100 border border-border-soft px-2 py-1 rounded">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="cursor-pointer hover:text-pink-200">
                                <FaTimes size={9} />
                            </button>
                        </span>
                    ))}
                    {(note.tags || []).length === 0 && (
                        <span className="text-xs text-richblack-500">No tags yet</span>
                    )}
                </div>
                <form onSubmit={addTag}>
                    <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="+ add a tag"
                        className="w-full bg-surface-hover border border-border-soft text-richblack-200 text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-yellow-50"
                    />
                </form>
            </div>
        </div>
    )
}

export default NoteOrganizer
