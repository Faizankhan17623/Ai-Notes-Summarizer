import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaFileUpload, FaKeyboard } from 'react-icons/fa'
import { SummarizeNotes } from '../../Services/operations/Notes.js'
import Navbar from '../Home/Navbar.jsx'
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
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>New Summary — AI Notes Summarizer</title></Helmet>
            <Navbar />

            <div className="max-w-3xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Summarize your notes</h1>

                <div className="flex gap-2 mb-6">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all
                                ${tab === key ? "bg-yellow-50 text-richblack-900" : "bg-richblack-800 text-richblack-200 hover:bg-richblack-700"}`}
                        >
                            <Icon /> {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
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
                                className="w-full bg-richblack-800 border border-richblack-700 text-richblack-5 rounded-md px-4 py-3 outline-none focus:border-yellow-50 resize-none"
                            />
                            <p className="text-richblack-400 text-xs mt-2">{text.trim().length} characters</p>
                        </div>
                    ) : (
                        <div>
                            <label className="text-sm text-richblack-100 block mb-2">Upload a PDF, Word (.docx), or TXT file</label>
                            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-richblack-700 rounded-lg py-16 cursor-pointer hover:border-yellow-50 transition-all">
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

                    <div className="mt-6">
                        <IconBtn
                            text={loading ? "Summarizing..." : "Summarize"}
                            type="submit"
                            disabled={loading || (tab === 'text' ? !text.trim() : !file)}
                        />
                    </div>
                </form>
            </div>
        </div>
    )
}

export default NewSummary
