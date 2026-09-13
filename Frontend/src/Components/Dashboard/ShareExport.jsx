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
        <div className="space-y-4">
            <div>
                <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1.5">Sharing</p>
                <button
                    onClick={handleToggleShare}
                    disabled={busy}
                    className={`flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-1.5 cursor-pointer w-full disabled:opacity-50 transition-colors ${shareId ? "bg-caribbeangreen-800/20 text-caribbeangreen-300 border border-caribbeangreen-800/40" : "bg-surface-hover text-richblack-300 border border-border-soft hover:border-yellow-50"}`}
                >
                    <FaShareAlt size={11} /> {shareId ? 'Public link on' : 'Share publicly'}
                </button>

                {shareUrl && (
                    <button
                        onClick={copyLink}
                        className="flex items-center justify-center gap-1.5 text-xs bg-surface-hover text-richblack-200 border border-border-soft rounded-md px-3 py-1.5 cursor-pointer w-full mt-2 hover:border-yellow-50"
                    >
                        <FaCopy size={11} /> Copy link
                    </button>
                )}
            </div>

            <div>
                <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1.5 flex items-center gap-1.5">
                    <FaDownload size={10} /> Export
                </p>
                <div className="flex flex-col gap-1.5">
                    {EXPORT_FORMATS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => dispatch(ExportNote(note._id, f.key, note.summary?.title, token))}
                            className="text-xs bg-surface-hover text-richblack-200 border border-border-soft rounded-md px-3 py-1.5 cursor-pointer hover:border-yellow-50 text-left"
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ShareExport
