import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import {
    FaFileAlt, FaComments, FaLayerGroup, FaBrain, FaArrowRight,
} from 'react-icons/fa'
import MarketingLayout from './MarketingLayout.jsx'

const SECTIONS = [
    {
        icon: FaFileAlt,
        accent: 'yellow',
        title: 'AI Summarization',
        body: "Paste text, upload a PDF/DOCX/TXT file, bring in an article by URL, or upload audio — our AI reads it and returns a structured summary: a TL;DR, key points, and action items. Deeper plans add sections, key terms, and AI-suggested tags automatically.",
    },
    {
        icon: FaComments,
        accent: 'violet',
        title: 'Note-grounded Chat',
        body: "Every summary comes with a chat partner that actually knows what's in your note. Ask follow-up questions, request clarification, or dig into specifics — answers are grounded in your own material, not generic web knowledge.",
        href: '/Features/Chat',
    },
    {
        icon: FaLayerGroup,
        accent: 'yellow',
        title: 'Flashcards & Quizzes',
        body: "Turn any note into study material on demand — auto-generated flashcards for active recall, or a scored multiple-choice quiz with explanations. No manual card-writing required.",
        href: '/Features/FlashcardsAndQuizzes',
    },
    {
        icon: FaBrain,
        accent: 'violet',
        title: 'Spaced Repetition',
        body: "Flashcards aren't just generated — they're scheduled. Our review queue uses a spaced-repetition algorithm that adapts to how well you know each card, so you spend time on what you're forgetting, not what you already remember.",
        href: '/Features/SpacedRepetition',
    },
]

const Features = () => {
    const { token } = useSelector((state) => state.auth)

    return (
        <MarketingLayout>
            <Helmet><title>Features — Notewise</title></Helmet>

            <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 text-center">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yellow-50 bg-yellow-50/10 px-3 py-1 rounded-full mb-6">
                    Features
                </span>
                <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                    Everything you need to turn notes into <span className="font-semibold text-yellow-50">understanding</span>
                </h1>
                <p className="text-richblack-200 text-lg max-w-2xl mx-auto">
                    Not just a summarizer — a full study companion that reads, explains, quizzes, and reminds you.
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
                {SECTIONS.map(({ icon: Icon, accent, title, body, href }) => {
                    const Wrapper = href ? Link : 'div'
                    return (
                        <Wrapper
                            key={title}
                            {...(href ? { to: href } : {})}
                            className={`group border border-border-soft rounded-xl bg-surface p-8 flex flex-col md:flex-row gap-6 items-start transition-colors ${accent === 'yellow' ? 'hover:border-yellow-50/40' : 'hover:border-violet-400/40'}`}
                        >
                            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${accent === 'yellow' ? 'bg-yellow-50/10 text-yellow-50' : 'bg-violet-400/10 text-violet-400'}`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <h2 className="text-richblack-5 font-display text-xl font-semibold mb-2 flex items-center gap-2">
                                    {title}
                                    {href && <FaArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </h2>
                                <p className="text-richblack-300 leading-relaxed">{body}</p>
                            </div>
                        </Wrapper>
                    )
                })}
            </div>

            <div className="border-t border-border-soft">
                <div className="max-w-4xl mx-auto px-6 py-20 text-center">
                    <h2 className="font-display text-3xl font-light text-richblack-5 mb-6">
                        Ready to try it on your own notes?
                    </h2>
                    <Link
                        to={token ? "/Dashboard/New-Summary" : "/Signup"}
                        className="inline-block bg-yellow-50 text-richblack-900 px-8 py-3 rounded-md font-semibold hover:scale-95 transition-all"
                    >
                        {token ? "Summarize your notes" : "Get started for free"}
                    </Link>
                </div>
            </div>
        </MarketingLayout>
    )
}

export default Features
