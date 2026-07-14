import {
    FaFileUpload, FaLink, FaYoutube, FaHeadphones, FaVideo, FaKeyboard,
} from 'react-icons/fa'
import { SUMMARIZER_EXPLAINERS } from './summarizerExplainerData.js'

// Mirrors the input widget for the active tab, but inert — this card is purely
// illustrative, the real interactive one lives in SummarizerHero above.
const PreviewCard = ({ tab }) => {
    if (tab === 'text') {
        return (
            <div className="border border-border-soft rounded-lg bg-surface p-5 min-h-[180px]">
                <p className="text-richblack-500 text-sm">Enter or paste your text here, then click Summarize.</p>
            </div>
        )
    }

    if (tab === 'article') {
        return (
            <div className="border border-border-soft rounded-lg bg-surface p-5 min-h-[180px] flex flex-col justify-between">
                <p className="text-richblack-500 text-sm">Paste an article or webpage link...</p>
                <div className="flex items-center gap-2 text-richblack-400 text-xs">
                    <FaLink size={12} /> URL or pasted text
                </div>
            </div>
        )
    }

    if (tab === 'youtube') {
        return (
            <div className="border border-border-soft rounded-lg bg-surface p-8 min-h-[180px] flex flex-col items-center justify-center gap-3">
                <FaYoutube className="text-red-500 text-3xl" />
                <p className="text-richblack-500 text-sm">Paste a YouTube URL here...</p>
            </div>
        )
    }

    if (tab === 'video') {
        return (
            <div className="border-2 border-dashed border-border-soft rounded-lg p-8 min-h-[180px] flex flex-col items-center justify-center gap-3">
                <FaVideo className="text-richblack-300 text-3xl" />
                <p className="text-richblack-400 text-sm">Drag & drop your video or browse</p>
                <p className="text-richblack-500 text-xs">Maximum file size: 100 MB</p>
            </div>
        )
    }

    if (tab === 'audio') {
        return (
            <div className="border-2 border-dashed border-border-soft rounded-lg p-8 min-h-[180px] flex flex-col items-center justify-center gap-3">
                <FaHeadphones className="text-richblack-300 text-3xl" />
                <p className="text-richblack-400 text-sm">Drag & drop your audio or browse</p>
                <p className="text-richblack-500 text-xs">Maximum file size: 10 MB</p>
            </div>
        )
    }

    // document
    return (
        <div className="border-2 border-dashed border-border-soft rounded-lg p-8 min-h-[180px] flex flex-col items-center justify-center gap-3">
            <FaFileUpload className="text-richblack-300 text-3xl" />
            <p className="text-richblack-400 text-sm">Drag & drop your doc or browse</p>
            <p className="text-richblack-500 text-xs">Maximum file size: 20 MB</p>
        </div>
    )
}

const SummarizerExplainer = ({ tab }) => {
    const data = SUMMARIZER_EXPLAINERS[tab] ?? SUMMARIZER_EXPLAINERS.text

    return (
        <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
                <div>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold text-richblack-5 mb-5">
                        {data.title}
                    </h2>
                    <p className="text-richblack-300 text-base leading-relaxed">
                        {data.body}
                    </p>
                </div>

                <div className="border border-border-soft rounded-xl bg-surface-raised p-1.5">
                    <div className="rounded-lg bg-surface p-5">
                        <p className="text-sm font-semibold text-richblack-5 mb-4">
                            AI <span className="text-yellow-50">{data.label}</span> Summarizer
                        </p>
                        <PreviewCard tab={tab} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SummarizerExplainer
