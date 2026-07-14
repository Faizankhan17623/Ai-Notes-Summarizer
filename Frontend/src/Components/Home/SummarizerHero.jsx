import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    FaKeyboard, FaFileAlt, FaLink, FaYoutube, FaVideo, FaHeadphones,
    FaFileUpload, FaClipboard, FaTools,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { SummarizeNotes } from '../../Services/operations/Notes.js'
import IconBtn from '../extra/IconBtn.jsx'

const TABS = [
    { key: 'text', label: 'Text', icon: FaKeyboard },
    { key: 'document', label: 'Document', icon: FaFileAlt },
    { key: 'article', label: 'Article', icon: FaLink },
    { key: 'youtube', label: 'YouTube', icon: FaYoutube },
    { key: 'video', label: 'Video', icon: FaVideo },
    { key: 'audio', label: 'Audio', icon: FaHeadphones },
]

const ComingSoon = ({ label }) => (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8">
        <FaTools className="text-richblack-400 text-3xl mb-4" />
        <p className="text-richblack-5 font-semibold mb-1">{label} summarizer is coming soon</p>
        <p className="text-richblack-400 text-sm max-w-sm">
            This feature is currently under development. We're working on it — check back soon.
        </p>
    </div>
)

const MAX_AUDIO_BYTES = 10 * 1024 * 1024

// the backend requires a protocol (isURL({ require_protocol: true })) sir, but users
// naturally type "example.com/article" without one — assume https rather than 400ing them
const normalizeArticleUrl = (raw) => {
    const trimmed = raw.trim()
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const SummarizerHero = ({ tab, setTab }) => {
    const [text, setText] = useState('')
    const [file, setFile] = useState(null)
    const [articleUrl, setArticleUrl] = useState('')
    const [audioFile, setAudioFile] = useState(null)

    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const { loading } = useSelector((state) => state.notes)

    const handleSummarize = () => {
        if (!token) {
            navigate('/Signup')
            return
        }

        if (tab === 'document') {
            if (!file) return
            const formData = new FormData()
            formData.append('notes', file)
            dispatch(SummarizeNotes(formData, token, navigate))
            return
        }

        if (tab === 'article') {
            if (!articleUrl.trim()) return
            dispatch(SummarizeNotes({ url: normalizeArticleUrl(articleUrl) }, token, navigate))
            return
        }

        if (tab === 'audio') {
            if (!audioFile) return
            const formData = new FormData()
            formData.append('audio', audioFile)
            dispatch(SummarizeNotes(formData, token, navigate))
            return
        }

        if (!text.trim()) return
        dispatch(SummarizeNotes({ notes: text, sourceType: 'text' }, token, navigate))
    }

    const handleAudioSelect = (selected) => {
        if (!selected) return
        if (selected.size > MAX_AUDIO_BYTES) {
            toast.error('That audio file is too large — please keep it under 10MB')
            return
        }
        setAudioFile(selected)
    }

    const canSubmit = tab === 'document'
        ? !!file
        : tab === 'article'
            ? articleUrl.trim().length > 0
            : tab === 'audio'
                ? !!audioFile
                : text.trim().length > 0

    return (
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-6 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full mb-6">
                Try it now
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-4">
                AI <span className="font-semibold text-yellow-50">Summarizer</span>
            </h1>
            <p className="text-richblack-200 text-lg mb-10 max-w-2xl mx-auto">
                Paste text, upload a document, or bring in an article, video, or audio — get a clear,
                structured summary in seconds.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer border transition-all
                            ${tab === key
                                ? "bg-yellow-50 text-richblack-900 border-yellow-50"
                                : "border-border-soft text-richblack-200 hover:text-richblack-5 hover:bg-surface-hover"}`}
                    >
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            <div className="border border-border-soft rounded-xl bg-surface text-left">
                {tab === 'text' && (
                    <div className="p-6">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={8}
                            placeholder="Enter or paste your text here, then click Summarize."
                            className="w-full bg-transparent text-richblack-5 outline-none resize-none placeholder:text-richblack-500"
                        />
                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border-soft">
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const clip = await navigator.clipboard.readText()
                                        setText(clip)
                                    } catch { /* clipboard permission denied — ignore */ }
                                }}
                                className="flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 cursor-pointer border border-border-soft rounded-md px-3 py-1.5 hover:bg-surface-hover transition-colors"
                            >
                                <FaClipboard size={12} /> Paste text
                            </button>
                            <IconBtn text={loading ? "Summarizing..." : "Summarize"} onclick={handleSummarize} disabled={loading || !canSubmit} />
                        </div>
                    </div>
                )}

                {tab === 'document' && (
                    <div className="p-6">
                        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border-soft rounded-lg py-14 cursor-pointer hover:border-yellow-50 transition-all">
                            <FaFileUpload className="text-richblack-300 text-3xl" />
                            <span className="text-richblack-300 text-sm">
                                {file ? file.name : "Drag & drop your doc or browse"}
                            </span>
                            <span className="text-richblack-500 text-xs">PDF, DOCX, or TXT</span>
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </label>
                        <div className="flex justify-end pt-4">
                            <IconBtn text={loading ? "Summarizing..." : "Summarize"} onclick={handleSummarize} disabled={loading || !canSubmit} />
                        </div>
                    </div>
                )}

                {tab === 'article' && (
                    <div className="p-6">
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
                        <div className="flex justify-end pt-4">
                            <IconBtn text={loading ? "Summarizing..." : "Summarize"} onclick={handleSummarize} disabled={loading || !canSubmit} />
                        </div>
                    </div>
                )}
                {tab === 'audio' && (
                    <div className="p-6">
                        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border-soft rounded-lg py-14 cursor-pointer hover:border-yellow-50 transition-all">
                            <FaHeadphones className="text-richblack-300 text-3xl" />
                            <span className="text-richblack-300 text-sm">
                                {audioFile ? audioFile.name : "Drag & drop your audio or browse"}
                            </span>
                            <span className="text-richblack-500 text-xs">MP3, WAV, M4A, OGG, FLAC, or WEBM — max 10MB</span>
                            <input
                                type="file"
                                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
                                className="hidden"
                                onChange={(e) => handleAudioSelect(e.target.files?.[0] || null)}
                            />
                        </label>
                        <div className="flex justify-end pt-4">
                            <IconBtn text={loading ? "Transcribing..." : "Summarize"} onclick={handleSummarize} disabled={loading || !canSubmit} />
                        </div>
                    </div>
                )}

                {tab === 'youtube' && <ComingSoon label="YouTube" />}
                {tab === 'video' && <ComingSoon label="Video" />}
            </div>
        </div>
    )
}

export default SummarizerHero
