import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaHistory, FaPen, FaUndo } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { EditNote, GetNoteVersions, RestoreNoteVersion } from '../../Services/operations/Notes.js'

// content edit + version history sir — the ONLY UI that changes a note's title/rawText after
// creation (organize/tags/folder live in NoteOrganizer.jsx, this is deliberately separate
// since only content edits get versioned, not metadata). Each save/restore snapshots the
// PRIOR state automatically on the backend, this component just surfaces the resulting list.
const NoteVersionHistory = ({ note }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { noteVersions } = useSelector((state) => state.notes)
    const [editing, setEditing] = useState(false)
    const [title, setTitle] = useState('')
    const [rawText, setRawText] = useState('')
    const [saving, setSaving] = useState(false)
    const [historyOpen, setHistoryOpen] = useState(false)

    useEffect(() => {
        dispatch(GetNoteVersions(note._id, token))
    }, [dispatch, note._id, token])

    // seeds the form from whatever `note` holds RIGHT NOW sir (picking up any restore that
    // happened while the form was closed), rather than keeping local state permanently synced
    // to a prop via a second effect — this only runs on the user's own click, never on render
    const startEditing = () => {
        setTitle(note.title || '')
        setRawText(note.rawText || '')
        setEditing(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const ok = await dispatch(EditNote(note._id, { title: title.trim(), rawText: rawText.trim() }, token))
        setSaving(false)
        if (ok) setEditing(false)
    }

    const handleRestore = async (version) => {
        const result = await Swal.fire({
            title: `Restore "${version.title}"?`,
            text: `This replaces the note's current content — but that current content is saved as a new version first, so you can always undo this too.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Restore',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(RestoreNoteVersion(note._id, version._id, token))
        }
    }

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold">Content &amp; history</p>
                {!editing && (
                    <button
                        onClick={startEditing}
                        className="flex items-center gap-1.5 text-xs font-medium text-yellow-50 cursor-pointer hover:underline"
                    >
                        <FaPen size={9} /> Edit
                    </button>
                )}
            </div>

            {editing ? (
                <div className="space-y-2.5">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={80}
                        placeholder="Title"
                        className="w-full bg-surface-hover border border-border-soft text-richblack-5 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50 transition-colors"
                    />
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={6}
                        placeholder="Source text"
                        className="w-full bg-surface-hover border border-border-soft text-richblack-5 text-sm rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors resize-none"
                    />
                    <p className="text-richblack-500 text-xs">Editing changes only the source text — the AI summary above won't be regenerated.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim() || !rawText.trim()}
                            className="bg-yellow-50 text-richblack-900 text-xs font-semibold rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={() => { setEditing(false); setTitle(note.title || ''); setRawText(note.rawText || '') }}
                            className="text-richblack-300 text-xs cursor-pointer hover:underline"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setHistoryOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-richblack-300 cursor-pointer hover:underline"
                >
                    <FaHistory size={9} /> Version history{noteVersions.length ? ` (${noteVersions.length})` : ''}
                </button>
            )}

            {!editing && historyOpen && (
                <div className="mt-3 pt-3 border-t border-border-soft">
                    {noteVersions.length === 0 ? (
                        <p className="text-richblack-500 text-xs">No past versions yet — these appear once you edit this note.</p>
                    ) : (
                        <ul className="space-y-2">
                            {noteVersions.map((v) => (
                                <li key={v._id} className="flex items-center justify-between gap-2 bg-surface-hover rounded-md px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-richblack-200 text-xs truncate">{v.title}</p>
                                        <p className="text-richblack-500 text-xs mt-0.5">{new Date(v.createdAt).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRestore(v)}
                                        title="Restore this version"
                                        aria-label={`Restore version from ${new Date(v.createdAt).toLocaleString()}`}
                                        className="text-richblack-400 hover:text-yellow-50 p-1.5 cursor-pointer rounded-md hover:bg-surface transition-colors shrink-0"
                                    >
                                        <FaUndo size={11} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}

export default NoteVersionHistory
