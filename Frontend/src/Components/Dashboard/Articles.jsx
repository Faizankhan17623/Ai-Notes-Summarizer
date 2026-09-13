import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import {
    FaLink, FaPlus, FaTimesCircle, FaCheckCircle, FaSpinner, FaRedo, FaComments,
} from 'react-icons/fa'
import { SummarizeArticleLink } from '../../Services/operations/Notes.js'
import IconBtn from '../extra/IconBtn.jsx'

const MAX_LINKS = 5

// the backend requires a protocol (isURL({ require_protocol: true })) sir, but users
// naturally type "example.com/article" without one — assume https rather than 400ing them
const normalizeArticleUrl = (raw) => {
    const trimmed = raw.trim()
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Dedicated multi-link article summarizer sir — the home-page hero's Article tab lands
// logged-in users here (carrying their typed link via router state). Links are processed
// ONE AT A TIME: Groq's free tier allows only ~8k tokens/minute, so firing them in
// parallel would guarantee rate-limit failures; sequential + a per-row Retry button for
// any link that still hits the limit is the honest UX. Each success becomes a normal
// note — images extracted from the article show on its Report page, and "Ask questions"
// jumps straight into the note-grounded chat.
const Articles = () => {
    const location = useLocation()
    const { token } = useSelector((state) => state.auth)

    // rows: { url, status: 'idle' | 'working' | 'done' | 'error', noteId?, title?, message?, rateLimited? }
    const [rows, setRows] = useState(() => [
        { url: location.state?.url || '', status: 'idle' },
    ])
    const [running, setRunning] = useState(false)

    const setRow = (index, patch) => {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    }

    const addRow = () => {
        setRows((prev) => (prev.length >= MAX_LINKS ? prev : [...prev, { url: '', status: 'idle' }]))
    }

    const removeRow = (index) => {
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
    }

    const summarizeOne = async (index, url) => {
        setRow(index, { status: 'working', message: null })
        const result = await SummarizeArticleLink(normalizeArticleUrl(url), token)
        if (result.ok) {
            setRow(index, { status: 'done', noteId: result.noteId, title: result.title })
        } else {
            setRow(index, { status: 'error', message: result.message, rateLimited: result.rateLimited })
        }
        return result.ok
    }

    const handleSummarizeAll = async () => {
        const pending = rows
            .map((r, i) => ({ ...r, i }))
            .filter((r) => r.url.trim() && r.status !== 'done' && r.status !== 'working')

        if (!pending.length) return

        setRunning(true)
        let succeeded = 0
        for (const row of pending) {
            const ok = await summarizeOne(row.i, row.url)
            if (ok) succeeded++
        }
        setRunning(false)

        if (succeeded === pending.length) {
            toast.success(succeeded === 1 ? 'Article summarized' : `All ${succeeded} articles summarized`)
        } else if (succeeded > 0) {
            toast.success(`Summarized ${succeeded} of ${pending.length} — retry the rest below`)
        } else {
            toast.error('Could not summarize those links — see the messages below')
        }
    }

    const canSubmit = !running && rows.some((r) => r.url.trim() && r.status !== 'done')

    return (
        <div className="px-6 md:px-10 py-10 max-w-3xl">
            <Helmet><title>Article Summarizer — Notewise</title></Helmet>

            <h1 className="font-display text-2xl font-semibold text-richblack-5 mb-2">Article summarizer</h1>
            <p className="text-richblack-300 text-sm mb-8">
                Paste up to {MAX_LINKS} article links — each becomes its own note with a structured summary
                and any images from the article. Links are processed one at a time. Once a summary is ready,
                open it and use <span className="text-richblack-100 font-medium">Chat</span> to ask questions
                about anything written in the article.
            </p>

            <div className="border border-border-soft rounded-lg bg-surface p-5 space-y-3">
                {rows.map((row, i) => (
                    <div key={i}>
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-2 flex-1 border rounded-md px-4 py-3 transition-colors
                                ${row.status === 'done' ? 'border-caribbeangreen-100/40' : 'border-border-soft focus-within:border-yellow-50'}`}>
                                {row.status === 'working' ? (
                                    <FaSpinner className="text-yellow-50 shrink-0 animate-spin" size={14} />
                                ) : row.status === 'done' ? (
                                    <FaCheckCircle className="text-caribbeangreen-100 shrink-0" size={14} />
                                ) : (
                                    <FaLink className="text-richblack-400 shrink-0" size={14} />
                                )}
                                <input
                                    type="url"
                                    value={row.url}
                                    disabled={row.status === 'working' || row.status === 'done'}
                                    onChange={(e) => setRow(i, { url: e.target.value, status: 'idle', message: null })}
                                    placeholder="https://example.com/article"
                                    className="w-full bg-transparent text-richblack-5 outline-none placeholder:text-richblack-500 text-sm disabled:opacity-60"
                                />
                            </div>
                            {rows.length > 1 && row.status !== 'working' && (
                                <button
                                    type="button"
                                    onClick={() => removeRow(i)}
                                    title="Remove this link"
                                    className="text-richblack-400 hover:text-pink-200 cursor-pointer shrink-0"
                                >
                                    <FaTimesCircle size={16} />
                                </button>
                            )}
                        </div>

                        {row.status === 'done' && (
                            <div className="flex items-center gap-4 mt-1.5 ml-1 text-xs">
                                <Link to={`/Dashboard/Note/${row.noteId}`} className="text-yellow-50 hover:underline">
                                    {row.title} — open note
                                </Link>
                                <Link to={`/Dashboard/Note/${row.noteId}`} className="flex items-center gap-1 text-richblack-300 hover:text-richblack-5">
                                    <FaComments size={11} /> Ask questions
                                </Link>
                            </div>
                        )}

                        {row.status === 'error' && (
                            <div className="flex items-center gap-3 mt-1.5 ml-1 text-xs">
                                <span className="text-pink-200">{row.message}</span>
                                <button
                                    type="button"
                                    onClick={() => summarizeOne(i, row.url)}
                                    className="flex items-center gap-1 text-yellow-50 hover:underline cursor-pointer"
                                >
                                    <FaRedo size={10} /> Retry
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={addRow}
                        disabled={rows.length >= MAX_LINKS || running}
                        className="flex items-center gap-2 text-sm text-richblack-300 hover:text-richblack-5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FaPlus size={11} /> Add another link
                    </button>
                    <IconBtn
                        text={running ? 'Summarizing…' : 'Summarize'}
                        onclick={handleSummarizeAll}
                        disabled={!canSubmit}
                    />
                </div>
            </div>

            <p className="text-richblack-500 text-xs mt-4">
                Each article uses 1 credit. If a link reports a per-minute limit, wait a moment and hit Retry.
            </p>
        </div>
    )
}

export default Articles
