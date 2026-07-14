import {
    FaNewspaper, FaPenNib, FaEnvelope, FaBookOpen, FaClipboardList, FaHashtag,
    FaLayerGroup, FaClock, FaBullseye, FaStar, FaChalkboardTeacher, FaMicrophone,
    FaWaveSquare, FaComments, FaGlobe, FaSearchDollar,
} from 'react-icons/fa'
import { SUMMARIZER_EXPLAINERS } from './summarizerExplainerData.js'

const ICONS = {
    article: FaNewspaper,
    edit: FaPenNib,
    mail: FaEnvelope,
    book: FaBookOpen,
    notes: FaClipboardList,
    social: FaHashtag,
    formats: FaLayerGroup,
    time: FaClock,
    accurate: FaBullseye,
    star: FaStar,
    lecture: FaChalkboardTeacher,
    mic: FaMicrophone,
    waveform: FaWaveSquare,
    chat: FaComments,
    news: FaGlobe,
    review: FaSearchDollar,
}

// Matches the reference design's light "islands" (same as SummarizerHowItWorks) —
// a violet icon badge, deliberately outside the dark theme for this section.
const SummarizerUseCases = ({ tab }) => {
    const data = SUMMARIZER_EXPLAINERS[tab] ?? SUMMARIZER_EXPLAINERS.text

    return (
        <div className="bg-white">
            <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-neutral-900 mb-4">
                    What Can You Summarize with Our <span className="italic text-violet-600">{data.useCasesTitle}</span>?
                </h2>
                <p className="text-neutral-500 mb-14">
                    Our AI summarizer is designed to handle virtually any type of content you throw at it:
                </p>

                <div className="grid md:grid-cols-2 gap-6 text-left">
                    {data.useCases.map((useCase) => {
                        const Icon = ICONS[useCase.icon] ?? FaStar
                        return (
                            <div key={useCase.title} className="rounded-2xl border border-neutral-200 p-6">
                                <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
                                    <Icon size={18} />
                                </div>
                                <h3 className="font-semibold text-neutral-900 mb-2">{useCase.title}</h3>
                                <p className="text-neutral-500 text-sm leading-relaxed">{useCase.body}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default SummarizerUseCases
