import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { FaBug, FaLightbulb, FaTimes, FaCheckCircle, FaImage } from 'react-icons/fa'
import { SubmitFeedbackReport, GetMyReports } from '../../Services/operations/Feedback.js'
import StatusBadge from '../Admin/StatusBadge.jsx'

const STATUS_TONE = { open: 'neutral', in_progress: 'neutral', planned: 'neutral', resolved: 'good', declined: 'danger' }
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', planned: 'Planned', resolved: 'Resolved', declined: 'Declined' }

const COPY = {
    bug: {
        titleLabel: 'What went wrong',
        titlePlaceholder: 'e.g. "Upload button does nothing on the Review page"',
        descriptionLabel: 'Describe the bug',
        descriptionPlaceholder: "What did you do, what did you expect, what actually happened?",
        submitLabel: 'Submit bug report',
        sentTitle: 'Bug report sent',
    },
    feature: {
        titleLabel: 'Your idea, in a sentence',
        titlePlaceholder: 'e.g. "Dark mode for the flashcard review screen"',
        descriptionLabel: 'Tell us more',
        descriptionPlaceholder: "What would this let you do? Why would it help?",
        submitLabel: 'Submit suggestion',
        sentTitle: 'Suggestion sent',
    },
}

const MAX_IMAGE_MB = 8

// the actual submit form sir — same fields/behavior as Components/Home/FeedbackForm.jsx
// (title/description/route/screenshot via SubmitFeedbackReport), just reshaped to live inside
// this modal's tab instead of standing alone on /ReportBug /SuggestFeature
const SubmitTab = ({ type, setType, token, onSubmitted }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm()
    const location = useLocation()
    const fileInputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [image, setImage] = useState(null)
    const [imageError, setImageError] = useState('')
    const copy = COPY[type]

    const handleImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setImageError('Please choose an image file')
            return
        }
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setImageError(`Image must be under ${MAX_IMAGE_MB}MB`)
            return
        }
        setImageError('')
        setImage(file)
    }

    const clearImage = () => {
        setImage(null)
        setImageError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const onSubmit = async (data) => {
        setLoading(true)
        const formData = new FormData()
        formData.append('title', data.title)
        formData.append('description', data.description)
        formData.append('route', location.pathname)
        if (image) formData.append('screenshot', image)

        const ok = await SubmitFeedbackReport(type, formData, token)
        setLoading(false)
        if (ok) {
            setSent(true)
            reset()
            clearImage()
            onSubmitted?.()
        }
    }

    if (sent) {
        return (
            <div className="border border-good/40 bg-good/10 rounded-lg p-6 text-center">
                <FaCheckCircle className="text-good text-2xl mx-auto mb-3" />
                <p className="text-richblack-5 font-medium mb-1">{copy.sentTitle}</p>
                <p className="text-richblack-300 text-sm">Thanks — we read every one and reply by email.</p>
                <button onClick={() => setSent(false)} className="text-yellow-50 text-sm mt-4 cursor-pointer hover:underline">
                    Submit another
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-1.5">
                {['bug', 'feature'].map((t) => {
                    const Icon = t === 'bug' ? FaBug : FaLightbulb
                    return (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium rounded-md px-3 py-2 cursor-pointer transition-colors ${type === t ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                        >
                            <Icon size={12} /> {t === 'bug' ? 'Report a bug' : 'Suggest a feature'}
                        </button>
                    )
                })}
            </div>

            <div>
                <label className="text-sm text-richblack-100 block mb-1">{copy.titleLabel}</label>
                <input
                    placeholder={copy.titlePlaceholder}
                    {...register('title', { required: true, maxLength: 150 })}
                    className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors placeholder:text-richblack-500"
                />
                {errors.title && <p className="text-danger-soft text-xs mt-1">This field is required</p>}
            </div>

            <div>
                <label className="text-sm text-richblack-100 block mb-1">{copy.descriptionLabel}</label>
                <textarea
                    rows={4}
                    placeholder={copy.descriptionPlaceholder}
                    {...register('description', { required: true, minLength: 10, maxLength: 3000 })}
                    className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors resize-none placeholder:text-richblack-500"
                />
                {errors.description && (
                    <p className="text-danger-soft text-xs mt-1">
                        {errors.description.type === 'minLength' ? "Please add a bit more detail (at least 10 characters)" : "This field is required"}
                    </p>
                )}
            </div>

            <div>
                <label className="text-sm text-richblack-100 block mb-1.5">Screenshot (optional)</label>
                {image ? (
                    <div className="flex items-center justify-between gap-3 bg-surface-hover border border-border-soft rounded-md px-3 py-2">
                        <span className="flex items-center gap-2 text-richblack-200 text-sm truncate">
                            <FaImage size={13} className="text-yellow-50 shrink-0" />
                            <span className="truncate">{image.name}</span>
                        </span>
                        <button type="button" onClick={clearImage} title="Remove image" className="text-richblack-400 hover:text-danger-soft cursor-pointer shrink-0">
                            <FaTimes size={13} />
                        </button>
                    </div>
                ) : (
                    <label className="flex items-center gap-2 justify-center border border-dashed border-border-soft rounded-md px-3 py-3 text-richblack-400 text-sm cursor-pointer hover:border-yellow-50/50 hover:text-richblack-200 transition-colors">
                        <FaImage size={13} />
                        Attach a screenshot
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                )}
                {imageError && <p className="text-danger-soft text-xs mt-1.5">{imageError}</p>}
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-50 text-richblack-900 text-sm font-semibold rounded-md px-4 py-2.5 cursor-pointer transition-all hover:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Submitting..." : copy.submitLabel}
            </button>
        </form>
    )
}

// a user's own submission history sir — GET /reports/mine via GetMyReports, separate from
// the Admin/Support triage view (FeedbackReports.jsx), read-only, no reply/status controls
const MyReportsTab = ({ token }) => {
    const [reports, setReports] = useState(null)

    // refreshKey changing means "fetch again" sir — the tab is unmounted/remounted with a
    // fresh `key` from the parent (see the `key={refreshKey}` below) instead of resetting
    // state imperatively here, so this effect only ever sets state once per mount
    useEffect(() => {
        let cancelled = false
        GetMyReports(token).then((r) => { if (!cancelled) setReports(r) })
        return () => { cancelled = true }
    }, [token])

    if (reports === null) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (reports.length === 0) {
        return <p className="text-richblack-400 text-sm text-center py-12">You haven't submitted anything yet.</p>
    }

    return (
        <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {reports.map((r) => {
                const Icon = r.type === 'bug' ? FaBug : FaLightbulb
                return (
                    <div key={r._id} className="border border-border-soft bg-surface-hover rounded-md p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Icon size={10} className="text-yellow-50 shrink-0" />
                                    <p className="text-richblack-5 text-sm font-medium truncate">{r.title}</p>
                                </div>
                                <p className="text-richblack-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                            </div>
                            <StatusBadge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status] || r.status}</StatusBadge>
                        </div>
                        {r.replyMessage && (
                            <p className="text-richblack-300 text-xs mt-2 pt-2 border-t border-border-soft whitespace-pre-wrap">{r.replyMessage}</p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// launched from the floating QuickActionsButton on any dashboard page sir — toggle between
// submitting a new bug/feature report and viewing the status of reports you've already sent
const FeedbackModal = ({ onClose }) => {
    const { token } = useSelector((state) => state.auth)
    const [tab, setTab] = useState('submit')
    const [type, setType] = useState('bug')
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-richblack-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center px-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative bg-surface-raised border border-border-soft rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                >
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-4 right-4 text-richblack-400 hover:text-richblack-5 cursor-pointer"
                    >
                        <FaTimes size={14} />
                    </button>

                    <h2 className="text-richblack-5 font-semibold text-lg mb-4">Bug reports & feature ideas</h2>

                    <div className="flex gap-1.5 mb-5">
                        <button
                            onClick={() => setTab('submit')}
                            className={`text-sm font-medium rounded-md px-3 py-1.5 cursor-pointer transition-colors ${tab === 'submit' ? "bg-yellow-50/10 text-yellow-50" : "text-richblack-400 hover:text-richblack-200"}`}
                        >
                            Submit
                        </button>
                        <button
                            onClick={() => { setTab('mine'); setRefreshKey((k) => k + 1) }}
                            className={`text-sm font-medium rounded-md px-3 py-1.5 cursor-pointer transition-colors ${tab === 'mine' ? "bg-yellow-50/10 text-yellow-50" : "text-richblack-400 hover:text-richblack-200"}`}
                        >
                            My reports
                        </button>
                    </div>

                    {tab === 'submit' ? (
                        <SubmitTab type={type} setType={setType} token={token} onSubmitted={() => setRefreshKey((k) => k + 1)} />
                    ) : (
                        <MyReportsTab key={refreshKey} token={token} />
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default FeedbackModal
