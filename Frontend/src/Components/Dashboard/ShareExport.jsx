import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaShareAlt, FaDownload, FaCopy } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { EnableShare, DisableShare, ExportNote } from '../../Services/operations/Notes.js'

const EXPORT_FORMATS = [
    { key: 'md', label: 'Markdown' },
    { key: 'pdf', label: 'PDF' },
    { key: 'docx', label: 'Word' },
]

const ShareExport = ({ note }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const [shareId, setShareId] = useState(note.shareEnabled ? note.shareId : null)
    const [busy, setBusy] = useState(false)

    const shareUrl = shareId ? `${window.location.origin}/shared/${shareId}` : null

    const handleToggleShare = async () => {
        setBusy(true)
        if (shareId) {
            const ok = await dispatch(DisableShare(note._id, token))
            if (ok) setShareId(null)
        } else {
            const id = await dispatch(EnableShare(note._id, token))
            if (id) setShareId(id)
        }
        setBusy(false)
    }

    const copyLink = () => {
        navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied')
    }

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
                onClick={handleToggleShare}
                disabled={busy}
                className={`flex items-center gap-1.5 text-xs rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-50 ${shareId ? "bg-caribbeangreen-800/20 text-caribbeangreen-300" : "bg-richblack-800 text-richblack-200 border border-richblack-700"}`}
            >
                <FaShareAlt size={11} /> {shareId ? 'Sharing on' : 'Share publicly'}
            </button>

            {shareUrl && (
                <button onClick={copyLink} className="flex items-center gap-1.5 text-xs bg-richblack-800 text-richblack-200 border border-richblack-700 rounded-md px-3 py-1.5 cursor-pointer">
                    <FaCopy size={11} /> Copy link
                </button>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
                <FaDownload size={11} className="text-richblack-400" />
                {EXPORT_FORMATS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => dispatch(ExportNote(note._id, f.key, note.summary?.title, token))}
                        className="text-xs bg-richblack-800 text-richblack-200 border border-richblack-700 rounded-md px-2.5 py-1.5 cursor-pointer hover:border-yellow-50"
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default ShareExport
