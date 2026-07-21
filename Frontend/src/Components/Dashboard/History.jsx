import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaTrash, FaThumbtack, FaStar, FaSearch, FaFilePdf, FaFileWord, FaFileAlt, FaMicrophone, FaFolderOpen } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetAllNotes, GetTagsAndFolders, OrganizeNote, DeleteNote, BulkDeleteNotes, BulkAddTag } from '../../Services/operations/Notes.js'

// same mapping as DashboardHome's recent-notes list sir — one source of truth would be nicer,
// but this file/DashboardHome.jsx are the only two consumers so a shared const isn't worth
// the extra import indirection yet
const sourceIcons = {
    pdf: FaFilePdf,
    docx: FaFileWord,
    txt: FaFileAlt,
    voice: FaMicrophone,
    text: FaFileAlt,
}

const History = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { allNotes, tags, folders, loading } = useSelector((state) => state.notes)
    const [search, setSearch] = useState('')
    const [tag, setTag] = useState('')
    const [folder, setFolder] = useState('')
    const [pinnedOnly, setPinnedOnly] = useState(false)
    const [favoritesOnly, setFavoritesOnly] = useState(false)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [bulkTagInput, setBulkTagInput] = useState('')

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
            if (favoritesOnly) filters.favorite = true
            dispatch(GetAllNotes(token, filters))
        }, 300)
        return () => clearTimeout(handle)
    }, [dispatch, token, search, tag, folder, pinnedOnly, favoritesOnly])

    const handleDelete = async (e, noteId) => {
        e.preventDefault()
        e.stopPropagation()
        const result = await Swal.fire({
            title: 'Delete this note?',
            text: 'This also deletes any chats grounded in it.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(DeleteNote(noteId, token))
        }
    }

    const toggleRow = (e, noteId) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIds((prev) => {
            const next = new Set(prev)
            next.has(noteId) ? next.delete(noteId) : next.add(noteId)
            return next
        })
    }

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.size === allNotes.length ? new Set() : new Set(allNotes.map((n) => n._id)))
    }

    const handleBulkDelete = async () => {
        const ids = [...selectedIds]
        const result = await Swal.fire({
            title: `Delete ${ids.length} note${ids.length === 1 ? '' : 's'}?`,
            text: 'This also deletes any chats grounded in them.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete all',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(BulkDeleteNotes(ids, token, () => setSelectedIds(new Set())))
        }
    }

    const handleBulkTag = (e) => {
        e.preventDefault()
        const value = bulkTagInput.trim()
        if (!value) return
        dispatch(BulkAddTag([...selectedIds], value, token, () => setSelectedIds(new Set())))
        setBulkTagInput('')
    }

    const togglePin = (e, note) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(OrganizeNote(note._id, { pinned: !note.pinned }, token))
        // optimistic-ish sir — the next GetAllNotes call (on any filter change) will reconcile anyway
        dispatch(GetAllNotes(token, { search: search.trim() || undefined, tag: tag || undefined, folder: folder || undefined, pinned: pinnedOnly || undefined, favorite: favoritesOnly || undefined }))
    }

    const toggleFavorite = (e, note) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(OrganizeNote(note._id, { favorite: !note.favorite }, token))
        dispatch(GetAllNotes(token, { search: search.trim() || undefined, tag: tag || undefined, folder: folder || undefined, pinned: pinnedOnly || undefined, favorite: favoritesOnly || undefined }))
    }

    const hasFilters = search.trim() || tag || folder || pinnedOnly || favoritesOnly

    return (
        <>
            <Helmet><title>History — Notewise</title></Helmet>

            <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="font-display text-3xl font-semibold text-richblack-5">Your notes</h1>
                    <span className="text-richblack-400 text-sm font-mono">{allNotes.length} total</span>
                </div>

                <div className="border border-border-soft bg-surface rounded-lg p-4 mb-6">
                    <div className="relative mb-3">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-500" size={13} />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()) }}
                            placeholder="Search your notes' content..."
                            className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md pl-9 pr-4 py-2.5 outline-none focus:border-yellow-50 transition-colors"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={tag}
                            onChange={(e) => { setTag(e.target.value); setSelectedIds(new Set()) }}
                            className="bg-surface-hover border border-border-soft text-richblack-200 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50"
                        >
                            <option value="">All tags</option>
                            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                            value={folder}
                            onChange={(e) => { setFolder(e.target.value); setSelectedIds(new Set()) }}
                            className="bg-surface-hover border border-border-soft text-richblack-200 text-sm rounded-md px-3 py-1.5 outline-none focus:border-yellow-50"
                        >
                            <option value="">All folders</option>
                            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button
                            onClick={() => { setPinnedOnly((p) => !p); setSelectedIds(new Set()) }}
                            className={`flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors ${pinnedOnly ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                        >
                            <FaThumbtack size={11} /> Pinned only
                        </button>
                        <button
                            onClick={() => { setFavoritesOnly((f) => !f); setSelectedIds(new Set()) }}
                            className={`flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors ${favoritesOnly ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                        >
                            <FaStar size={11} /> Favorites only
                        </button>
                    </div>
                </div>

                {/* only shown once something's selected sir — same treatment as the Admin
                    Users bulk action bar */}
                {selectedIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-2.5 border border-yellow-50/30 bg-yellow-50/5 rounded-lg animate-fade-in-up">
                        <span className="text-sm text-richblack-5 font-medium">{selectedIds.size} selected</span>
                        <button
                            onClick={handleBulkDelete}
                            className="text-xs font-medium rounded-md px-3 py-1.5 bg-danger-soft/10 text-danger-soft hover:bg-danger-soft/20 cursor-pointer transition-colors"
                        >
                            Delete selected
                        </button>
                        <form onSubmit={handleBulkTag} className="flex items-center gap-1.5">
                            <input
                                value={bulkTagInput}
                                onChange={(e) => setBulkTagInput(e.target.value)}
                                placeholder="Add tag..."
                                className="text-xs rounded-md px-2.5 py-1.5 bg-surface-hover border border-border-soft text-richblack-5 outline-none focus:border-yellow-50 w-28"
                            />
                            <button
                                type="submit"
                                disabled={!bulkTagInput.trim()}
                                className="text-xs font-medium rounded-md px-3 py-1.5 bg-surface-hover border border-border-soft text-richblack-200 hover:border-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                Add
                            </button>
                        </form>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-richblack-400 hover:text-richblack-200 cursor-pointer ml-auto"
                        >
                            Clear
                        </button>
                    </div>
                )}

                {!loading && allNotes.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-richblack-400 mb-3 cursor-pointer w-fit">
                        <input
                            type="checkbox"
                            checked={selectedIds.size === allNotes.length}
                            onChange={toggleSelectAll}
                            className="cursor-pointer"
                        />
                        Select all
                    </label>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : allNotes.length === 0 ? (
                    <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                        <FaFolderOpen className="text-richblack-600 text-3xl mx-auto mb-4" />
                        <p className="text-richblack-100 font-medium mb-1.5">
                            {hasFilters ? 'No notes match your filters' : 'No notes yet'}
                        </p>
                        <p className="text-richblack-400 text-sm">
                            {hasFilters ? 'Try a different search term or clear the filters.' : 'Create your first summary to see it here.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {allNotes.map((note) => {
                            const Icon = sourceIcons[note.sourceType] || FaFileAlt
                            return (
                                <Link
                                    key={note._id}
                                    to={`/Dashboard/Note/${note._id}`}
                                    className="flex items-center gap-3 border border-border-soft bg-surface rounded-lg p-4 hover:border-yellow-50/50 hover:bg-surface-hover transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(note._id)}
                                        onClick={(e) => toggleRow(e, note._id)}
                                        onChange={() => {}}
                                        className="cursor-pointer shrink-0"
                                    />
                                    <span className="w-9 h-9 rounded-md bg-yellow-50/10 text-yellow-50 flex items-center justify-center shrink-0">
                                        <Icon size={14} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-richblack-5 font-medium truncate">{note.title}</p>
                                            {note.pinned && <FaThumbtack size={11} className="text-yellow-50 shrink-0" />}
                                            {note.favorite && <FaStar size={11} className="text-yellow-50 shrink-0" />}
                                        </div>
                                        <p className="text-richblack-400 text-xs mt-1">
                                            {new Date(note.createdAt).toLocaleDateString()} · {note.sourceType} · {note.plan}
                                            {note.folder && ` · ${note.folder}`}
                                        </p>
                                        {note.tags?.length > 0 && (
                                            <div className="flex gap-1 mt-1.5">
                                                {note.tags.map((t) => (
                                                    <span key={t} className="text-xs bg-surface-hover text-richblack-200 border border-border-soft px-2 py-0.5 rounded">{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={(e) => togglePin(e, note)} title={note.pinned ? "Unpin" : "Pin"} className={`p-2 cursor-pointer rounded-md hover:bg-surface-hover transition-colors ${note.pinned ? "text-yellow-50" : "text-richblack-400 hover:text-yellow-50"}`}>
                                            <FaThumbtack size={13} />
                                        </button>
                                        <button onClick={(e) => toggleFavorite(e, note)} title={note.favorite ? "Remove favorite" : "Favorite"} className={`p-2 cursor-pointer rounded-md hover:bg-surface-hover transition-colors ${note.favorite ? "text-yellow-50" : "text-richblack-400 hover:text-yellow-50"}`}>
                                            <FaStar size={13} />
                                        </button>
                                        <button onClick={(e) => handleDelete(e, note._id)} className="text-richblack-400 hover:text-danger-soft p-2 cursor-pointer rounded-md hover:bg-surface-hover transition-colors">
                                            <FaTrash size={13} />
                                        </button>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}

export default History
