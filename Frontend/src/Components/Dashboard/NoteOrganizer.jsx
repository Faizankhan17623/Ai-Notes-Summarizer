import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaThumbtack, FaTimes } from 'react-icons/fa'
import { OrganizeNote } from '../../Services/operations/Notes.js'

// tags/folder/pin editing sir — lives on the Report page, right under the title
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

    return (
        <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
                onClick={togglePin}
                className={`flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1 cursor-pointer ${note.pinned ? "bg-yellow-50 text-richblack-900" : "bg-richblack-800 text-richblack-300 border border-richblack-700"}`}
            >
                <FaThumbtack size={10} /> {note.pinned ? "Pinned" : "Pin"}
            </button>

            <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                onBlur={saveFolder}
                placeholder="Folder (optional)"
                className="bg-richblack-800 border border-richblack-700 text-richblack-200 text-xs rounded-md px-2.5 py-1 w-36 outline-none focus:border-yellow-50"
            />

            <div className="flex flex-wrap items-center gap-1.5">
                {(note.tags || []).map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-richblack-700 text-richblack-100 px-2 py-1 rounded">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="cursor-pointer hover:text-pink-200">
                            <FaTimes size={9} />
                        </button>
                    </span>
                ))}
                <form onSubmit={addTag}>
                    <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="+ tag"
                        className="bg-richblack-800 border border-richblack-700 text-richblack-200 text-xs rounded-md px-2 py-1 w-20 outline-none focus:border-yellow-50"
                    />
                </form>
            </div>
        </div>
    )
}

export default NoteOrganizer
