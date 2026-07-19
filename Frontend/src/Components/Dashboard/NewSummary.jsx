import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import {
    FaFileUpload, FaKeyboard, FaLink, FaYoutube, FaVideo, FaHeadphones, FaTools, FaLayerGroup,
    FaCheckCircle, FaTimesCircle,
} from 'react-icons/fa'
import { SummarizeNotes, BulkSummarizeNotes } from '../../Services/operations/Notes.js'
import MicButton from '../extra/MicButton.jsx'
import IconBtn from '../extra/IconBtn.jsx'

const TABS = [
    { key: 'text', label: 'Text', icon: FaKeyboard },
    { key: 'file', label: 'Document', icon: FaFileUpload },
    { key: 'bulk', label: 'Bulk upload', icon: FaLayerGroup },
    { key: 'article', label: 'Article', icon: FaLink },
    { key: 'youtube', label: 'YouTube', icon: FaYoutube },
    { key: 'video', label: 'Video', icon: FaVideo },
    { key: 'audio', label: 'Audio', icon: FaHeadphones },
]

const MAX_BULK_FILES = 20

const MAX_AUDIO_BYTES = 10 * 1024 * 1024

// the backend requires a protocol (isURL({ require_protocol: true })) sir, but users
// naturally type "example.com/article" without one — assume https rather than 400ing them
const normalizeArticleUrl = (raw) => {
    const trimmed = raw.trim()
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const ComingSoon = ({ label }) => (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8 min-h-[300px]">
        <FaTools className="text-richblack-400 text-3xl mb-4" />
        <p className="text-richblack-5 font-semibold mb-1">{label} summarizer is coming soon</p>
        <p className="text-richblack-400 text-sm max-w-sm">
            This feature is currently under development. We're working on it — check back soon.
        </p>
    </div>
)

const NewSummary = () => {
    const [tab, setTab] = useState('text')
    const [text, setText] = useState('')
    const [file, setFile] = useState(null)
    const [dictated, setDictated] = useState(false)
    const [articleUrl, setArticleUrl] = useState('')
    const [audioFile, setAudioFile] = useState(null)
    const [bulkFiles, setBulkFiles] = useState([])
    const [bulkResults, setBulkResults] = useState(null)

    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const { loading } = useSelector((state) => state.notes)

    // the mic feeds its growing transcript straight into the same textarea sir
    const handleTranscript = useCallback((transcript) => {
        setDictated(true)
        setText(transcript)
    }, [])

    const handleAudioSelect = (selected) => {
        if (!selected) return
        if (selected.size > MAX_AUDIO_BYTES) {
            toast.error('That audio file is too large — please keep it under 10MB')
            return
        }
        setAudioFile(selected)
    }

    const handleBulkSelect = (fileList) => {
        const selected = Array.from(fileList || [])
        if (!selected.length) return
        if (selected.length > MAX_BULK_FILES) {
            toast.error(`You can summarize up to ${MAX_BULK_FILES} files at once`)
            return
        }
        setBulkResults(null)
        setBulkFiles(selected)
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        if (tab === 'bulk') {
            if (!bulkFiles.length) return
            const formData = new FormData()
            bulkFiles.forEach((f) => formData.append('notes', f))
            dispatch(BulkSummarizeNotes(formData, token, (results) => {
                setBulkResults(results)
                setBulkFiles([])
            }))
            return
        }

        if (tab === 'file') {
            if (!file) return
            const formData = new FormData()
            formData.append('notes', file)
            dispatch(SummarizeNotes(formData, token, navigate))
            return
        }

        if (tab === 'article') {
            if (!articleUrl.trim()) return
            // articles get their own dashboard page sir — multi-link input, per-link status,
            // image extraction; same redirect the homepage hero's Article tab uses, so there's
            // one consistent place article links end up regardless of where they're pasted
            navigate('/Dashboard/Articles', { state: { url: normalizeArticleUrl(articleUrl) } })
            return
        }

        if (tab === 'audio') {
            if (!audioFile) return
            const formData = new FormData()
            formData.append('audio', audioFile)
            dispatch(SummarizeNotes(formData, token, navigate))
            return
        }

        if (tab === 'youtube' || tab === 'video') return

        if (!text.trim()) return
        dispatch(SummarizeNotes({ notes: text, sourceType: dictated ? 'voice' : 'text' }, token, navigate))
    }

    const canSubmit = tab === 'bulk'
        ? bulkFiles.length > 0
        : tab === 'file'
            ? !!file
            : tab === 'article'
                ? articleUrl.trim().length > 0
                : tab === 'audio'
                    ? !!audioFile
                    : tab === 'youtube' || tab === 'video'
                        ? false
                        : text.trim().length > 0

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>New Summary — Notewise</title></Helmet>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h1 className="font-display text-2xl font-semibold text-richblack-5">New summary</h1>
                <div className="flex flex-wrap gap-1 bg-surface-raised border border-border-soft rounded-md p-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => { setTab(key); setBulkResults(null) }}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-sm font-medium cursor-pointer transition-all
                                ${tab === key ? "bg-yellow-50 text-richblack-900" : "text-richblack-300 hover:text-richblack-5"}`}
                        >
                            <Icon size={13} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="border border-border-soft rounded-lg bg-surface p-5">
                    {tab === 'text' && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-richblack-100">Your notes</label>
                                <MicButton onTranscript={handleTranscript} />
                            </div>
                            <textarea
                                value={text}
                                onChange={(e) => { setDictated(false); setText(e.target.value) }}
                                rows={14}
                                placeholder="Paste meeting notes, lecture notes, or just type freely... or hit Speak to dictate."
                                className="w-full bg-transparent text-richblack-5 outline-none resize-none placeholder:text-richblack-500"
                            />
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-soft">
                                <p className="text-richblack-400 text-xs font-mono">{text.trim().length} characters</p>
                            </div>
                        </div>
                    )}

                    {tab === 'file' && (
                        <div>
                            <label className="text-sm text-richblack-100 block mb-3">Upload a PDF, Word (.docx), or TXT file</label>
                            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border-soft rounded-lg py-16 cursor-pointer hover:border-yellow-50 transition-all">
                                <FaFileUpload className="text-richblack-300 text-3xl" />
                                <span className="text-richblack-300 text-sm">
                                    {file ? file.name : "Click to choose a file"}
                                </span>
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                    )}

                    {tab === 'bulk' && (
                        <div>
                            <label className="text-sm text-richblack-100 block mb-3">
                                Upload up to {MAX_BULK_FILES} PDF, Word (.docx), or TXT files — each becomes its own summary and counts against your monthly bulk upload limit
                            </label>
                            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border-soft rounded-lg py-12 cursor-pointer hover:border-yellow-50 transition-all">
                                <FaLayerGroup className="text-richblack-300 text-3xl" />
                                <span className="text-richblack-300 text-sm">
                                    {bulkFiles.length ? `${bulkFiles.length} file${bulkFiles.length === 1 ? '' : 's'} selected` : "Click to choose files"}
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.txt"
                                    className="hidden"
                                    onChange={(e) => handleBulkSelect(e.target.files)}
                                />
                            </label>

                            {bulkFiles.length > 0 && (
                                <ul className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
                                    {bulkFiles.map((f, i) => (
                                        <li key={`${f.name}-${i}`} className="flex items-center justify-between text-sm text-richblack-200 bg-surface-hover rounded px-3 py-1.5">
                                            <span className="truncate">{f.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setBulkFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                                className="text-richblack-400 hover:text-pink-200 shrink-0 ml-2 cursor-pointer"
                                            >
                                                <FaTimesCircle size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {bulkResults && (
                                <div className="mt-4 border-t border-border-soft pt-4 space-y-1.5 max-h-56 overflow-y-auto">
                                    {bulkResults.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            {r.ok ? (
                                                <FaCheckCircle className="text-caribbeangreen-100 mt-0.5 shrink-0" size={13} />
                                            ) : (
                                                <FaTimesCircle className="text-pink-200 mt-0.5 shrink-0" size={13} />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-richblack-200 truncate">{r.fileName}</p>
                                                {r.ok ? (
                                                    <Link to={`/Dashboard/Note/${r.noteId}`} className="text-yellow-50 text-xs hover:underline">
                                                        {r.title}
                                                    </Link>
                                                ) : (
                                                    <p className="text-richblack-500 text-xs">{r.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'article' && (
                        <div>
                            <label className="text-sm text-richblack-100 block mb-3">Paste an article or webpage link</label>
                            <div className="flex items-center gap-2 border border-border-soft rounded-md px-4 py-3 focus-within:border-yellow-50 transition-colors">
                                <FaLink className="text-richblack-400 shrink-0" size={14} />
                                <input
                                    type="url"
                                    value={articleUrl}
                                    onChange={(e) => setArticleUrl(e.target.value)}
                                    placeholder="https://example.com/article"
                                    className="w-full bg-transparent text-richblack-5 outline-none placeholder:text-richblack-500 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {tab === 'audio' && (
                        <div>
                            <label className="text-sm text-richblack-100 block mb-3">Upload an audio file</label>
                            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border-soft rounded-lg py-14 cursor-pointer hover:border-yellow-50 transition-all">
                                <FaHeadphones className="text-richblack-300 text-3xl" />
                                <span className="text-richblack-300 text-sm">
                                    {audioFile ? audioFile.name : "Click to choose a file"}
                                </span>
                                <span className="text-richblack-500 text-xs">MP3, WAV, M4A, OGG, FLAC, or WEBM — max 10MB</span>
                                <input
                                    type="file"
                                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
                                    className="hidden"
                                    onChange={(e) => handleAudioSelect(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                    )}

                    {tab === 'youtube' && <ComingSoon label="YouTube" />}
                    {tab === 'video' && <ComingSoon label="Video" />}

                    {tab !== 'youtube' && tab !== 'video' && (
                        <div className="mt-5">
                            <IconBtn
                                text={loading ? "Summarizing..." : tab === 'bulk' ? `Summarize ${bulkFiles.length || ''} file${bulkFiles.length === 1 ? '' : 's'}`.trim() : "Summarize"}
                                type="submit"
                                disabled={loading || !canSubmit}
                            />
                        </div>
                    )}
                </div>

                {/* preview panel sir — the app still submits then navigates to the note's own
                    Report page rather than rendering the result inline, so this is a placeholder
                    for now, not a live preview. Real estate reserved for a future inline-result pass */}
                <div className="border border-border-soft rounded-lg bg-surface min-h-[360px] flex items-center justify-center px-8 py-12 text-center">
                    <div>
                        <p className="text-richblack-300 text-sm mb-1">Your structured summary will appear here</p>
                        <p className="text-richblack-500 text-xs">Submit your notes on the left to get a TL;DR, key points, and action items.</p>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default NewSummary
