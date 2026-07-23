import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaBookmark, FaPlus, FaTimes } from 'react-icons/fa'
import { GetSavedViews, CreateSavedView, DeleteSavedView } from '../../Services/operations/Admin.js'

// shared "saved filter views" bar sir — drops into any admin list page's filter row.
// `page` is one of 'users'|'payments'|'audit'|'ai-logs' (matches Backend/Models/SavedView.js's
// enum), `filters` is whatever shape that page's own filter state already has, and `onApply`
// is called with a saved view's stored filters when the caller clicks it — the page itself
// owns applying those values to its own useState, this component never reaches into that.
const SavedViewsBar = ({ page, filters, onApply }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const views = useSelector((state) => state.admin.savedViews[page] || [])
    const [naming, setNaming] = useState(false)
    const [name, setName] = useState('')

    useEffect(() => {
        dispatch(GetSavedViews(page, token))
    }, [dispatch, page, token])

    const handleSave = (e) => {
        e.preventDefault()
        if (!name.trim()) return
        dispatch(CreateSavedView(page, name.trim(), filters, token))
        setName('')
        setNaming(false)
    }

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {views.map((v) => (
                <span key={v._id} className="group flex items-center gap-1 bg-surface-hover border border-border-soft rounded-md pl-2.5 pr-1 py-1">
                    <button
                        onClick={() => onApply(v.filters)}
                        className="flex items-center gap-1.5 text-xs text-richblack-200 cursor-pointer hover:text-yellow-50 transition-colors"
                    >
                        <FaBookmark size={9} /> {v.name}
                    </button>
                    <button
                        onClick={() => dispatch(DeleteSavedView(v._id, page, token))}
                        title="Delete this saved view"
                        aria-label={`Delete saved view ${v.name}`}
                        className="text-richblack-500 hover:text-danger-soft p-1 cursor-pointer rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <FaTimes size={9} />
                    </button>
                </span>
            ))}

            {naming ? (
                <form onSubmit={handleSave} className="flex items-center gap-1.5">
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => { if (!name.trim()) setNaming(false) }}
                        placeholder="View name..."
                        maxLength={60}
                        className="bg-surface border border-border-soft text-richblack-5 text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-yellow-50 transition-colors w-32"
                    />
                    <button type="submit" disabled={!name.trim()} className="text-yellow-50 text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
                </form>
            ) : (
                <button
                    onClick={() => setNaming(true)}
                    className="flex items-center gap-1.5 text-xs text-richblack-400 hover:text-richblack-200 cursor-pointer transition-colors px-2 py-1.5"
                >
                    <FaPlus size={9} /> Save current filters
                </button>
            )}
        </div>
    )
}

export default SavedViewsBar
