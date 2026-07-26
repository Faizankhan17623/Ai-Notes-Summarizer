import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaBug, FaLightbulb, FaCheckCircle, FaImage, FaTimes } from 'react-icons/fa'
import { SubmitFeedbackReport } from '../../Services/operations/Feedback.js'
import MarketingLayout from './MarketingLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

// mirrors Backend/Models/FeedbackReport.js's `type` enum sir — one shared component for both
// forms since they're structurally identical (title/description/route/screenshot), only the
// copy differs, same reasoning the backend used to keep this one collection instead of two
const COPY = {
    bug: {
        icon: FaBug,
        title: 'Report a bug',
        subtitle: "Something not working right? Tell us what happened and we'll look into it.",
        titleLabel: 'What went wrong',
        titlePlaceholder: 'e.g. "Upload button does nothing on the Review page"',
        descriptionLabel: 'Describe the bug',
        descriptionPlaceholder: "What did you do, what did you expect, what actually happened? The more detail the faster we can fix it.",
        sentTitle: 'Bug report sent',
        sentBody: "Thanks for the report — we'll take a look and reply by email.",
    },
    feature: {
        icon: FaLightbulb,
        title: 'Suggest a feature',
        subtitle: "Got an idea that would make Notewise better? We'd love to hear it.",
        titleLabel: 'Your idea, in a sentence',
        titlePlaceholder: 'e.g. "Dark mode for the flashcard review screen"',
        descriptionLabel: 'Tell us more',
        descriptionPlaceholder: "What would this let you do? Why would it help?",
        sentTitle: 'Suggestion sent',
        sentBody: "Thanks for the idea — we read every suggestion and reply by email.",
    },
}

const MAX_IMAGE_MB = 8

const FeedbackForm = ({ type }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm()
    const { token } = useSelector((state) => state.auth)
    const location = useLocation()
    const navigate = useNavigate()
    const fileInputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [image, setImage] = useState(null)
    const [imageError, setImageError] = useState('')

    const copy = COPY[type]
    const Icon = copy.icon

    // logged-in only sir, any role — the backend gate is a plain Auth check (not role-scoped),
    // so this mirrors that rather than reusing PrivateRoute (which bounces Admin/Support away
    // to their own dashboards; a Support agent should still be able to report a bug)
    if (!token) {
        navigate('/Login')
        return null
    }

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
        // captured automatically sir, not typed by the user — the exact page they were on
        // when they opened this form (see Backend/Models/FeedbackReport.js's `route` field)
        formData.append('route', location.state?.fromRoute || '')
        if (image) formData.append('screenshot', image)

        const ok = await SubmitFeedbackReport(type, formData, token)
        setLoading(false)
        if (ok) {
            setSent(true)
            reset()
            clearImage()
        }
    }

    return (
        <MarketingLayout>
            <Helmet><title>{copy.title} — Notewise</title></Helmet>

            <div className="max-w-lg mx-auto px-6 py-20">
                <div className="flex justify-center mb-4">
                    <span className="w-12 h-12 rounded-xl bg-yellow-50/10 text-yellow-50 flex items-center justify-center">
                        <Icon size={20} />
                    </span>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-semibold text-richblack-5 mb-2 text-center">{copy.title}</h1>
                <p className="text-richblack-300 text-center mb-10">{copy.subtitle}</p>

                {sent ? (
                    <div className="border border-good/40 bg-good/10 rounded-lg p-6 text-center">
                        <FaCheckCircle className="text-good text-2xl mx-auto mb-3" />
                        <p className="text-richblack-5 font-medium mb-1">{copy.sentTitle}</p>
                        <p className="text-richblack-300 text-sm">{copy.sentBody}</p>
                        <button onClick={() => setSent(false)} className="text-yellow-50 text-sm mt-4 cursor-pointer hover:underline">
                            Submit another
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label={copy.titleLabel}
                            {...register('title', { required: true, maxLength: 150 })}
                            error={errors.title && "This field is required"}
                        />
                        <div>
                            <label className="text-sm text-richblack-100 block mb-1">{copy.descriptionLabel}</label>
                            <textarea
                                rows={6}
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

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Submitting..." : type === 'bug' ? "Submit bug report" : "Submit suggestion"}
                        </Button>
                    </form>
                )}
            </div>
        </MarketingLayout>
    )
}

export default FeedbackForm
