import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaFileUpload, FaKeyboard } from 'react-icons/fa'
import { SummarizeNotes } from '../../Services/operations/Notes.js'
import MicButton from '../extra/MicButton.jsx'
import IconBtn from '../extra/IconBtn.jsx'

const TABS = [
    { key: 'text', label: 'Paste / Type', icon: FaKeyboard },
    { key: 'file', label: 'Upload file', icon: FaFileUpload },
]

const NewSummary = () => {
    const [tab, setTab] = useState('text')
    const [text, setText] = useState('')
    const [file, setFile] = useState(null)
    const [dictated, setDictated] = useState(false)

    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const { loading } = useSelector((state) => state.notes)

    // the mic feeds its growing transcript straight into the same textarea sir
    const handleTranscript = useCallback((transcript) => {
        setDictated(true)
        setText(transcript)
    }, [])

    const handleSubmit = (e) => {
        e.preventDefault()

        if (tab === 'file') {
            if (!file) return
            const formData = new FormData()
            formData.append('notes', file)
            dispatch(SummarizeNotes(formData, token, navigate))
            return
        }

        if (!text.trim()) return
        dispatch(SummarizeNotes({ notes: text, sourceType: dictated ? 'voice' : 'text' }, token, navigate))
    }

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>New Summary — AI Notes Summarizer</title></Helmet>

            <div className="flex items-center justify-between mb-6">
                <h1 className="font-display text-2xl font-semibold text-richblack-5">New summary</h1>
                <div className="flex gap-1 bg-surface-raised border border-border-soft rounded-md p-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-sm font-medium cursor-pointer transition-all
                                ${tab === key ? "bg-yellow-50 text-richblack-900" : "text-richblack-300 hover:text-richblack-5"}`}
                        >
                            <Icon /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="border border-border-soft rounded-lg bg-surface p-5">
                    {tab === 'text' ? (
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
                    ) : (
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

                    <div className="mt-5">
                        <IconBtn
                            text={loading ? "Summarizing..." : "Summarize"}
                            type="submit"
                            disabled={loading || (tab === 'text' ? !text.trim() : !file)}
                        />
                    </div>
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
