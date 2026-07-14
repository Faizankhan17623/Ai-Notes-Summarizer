import {
    FaClipboardList, FaBullseye, FaLayerGroup, FaCrosshairs, FaLanguage, FaStar,
    FaChalkboardTeacher, FaBookOpen, FaPenNib, FaYoutube, FaClock, FaExpandArrowsAlt,
    FaMusic,
} from 'react-icons/fa'
import { SUMMARIZER_EXPLAINERS } from './summarizerExplainerData.js'

const ICONS = {
    notes: FaClipboardList,
    accurate: FaBullseye,
    formats: FaLayerGroup,
    accurate2: FaCrosshairs,
    lang: FaLanguage,
    star: FaStar,
    lecture: FaChalkboardTeacher,
    book: FaBookOpen,
    edit: FaPenNib,
    youtube: FaYoutube,
    time: FaClock,
    length: FaExpandArrowsAlt,
    audio: FaMusic,
}

// Third light-themed section per tab (after HowItWorks and UseCases) — 3-column benefits
// grid, matching the reference's "Why Use Our AI [X] Summarizer?" pattern.
const SummarizerWhyUse = ({ tab }) => {
    const data = SUMMARIZER_EXPLAINERS[tab] ?? SUMMARIZER_EXPLAINERS.text

    return (
        <div className="bg-white border-t border-neutral-100">
            <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-neutral-900 mb-14">
                    Why Use Our <span className="italic text-violet-600">{data.whyTitle}</span>?
                </h2>

                <div className="grid md:grid-cols-3 gap-x-10 gap-y-12 text-left">
                    {data.whyBenefits.map((benefit) => {
                        const Icon = ICONS[benefit.icon] ?? FaStar
                        return (
                            <div key={benefit.title}>
                                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
                                    <Icon size={16} />
                                </div>
                                <h3 className="font-semibold text-neutral-900 mb-2">{benefit.title}</h3>
                                <p className="text-neutral-500 text-sm leading-relaxed">{benefit.body}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default SummarizerWhyUse
