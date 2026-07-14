import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaGraduationCap, FaFlask, FaUsers } from 'react-icons/fa'
import MarketingLayout from './MarketingLayout.jsx'

const SOLUTIONS = [
    {
        icon: FaGraduationCap,
        accent: 'yellow',
        title: 'For Students',
        body: "Turn lecture recordings, textbook chapters, and scattered notes into structured summaries you can actually study from. Generate flashcards before an exam, quiz yourself on demand, and let spaced repetition tell you what to review next — instead of re-reading everything from scratch.",
        points: ['Summarize lecture notes and textbook PDFs in seconds', 'Auto-generate flashcards and quizzes per topic', 'Daily study streaks keep you consistent before exams'],
    },
    {
        icon: FaFlask,
        accent: 'violet',
        title: 'For Researchers',
        body: "Distill papers, reports, and long-form reading without losing the details that matter. Paste an article URL or upload a PDF, get key findings and structured sections back, then chat with the note to pull out exact figures or arguments without hunting through pages again.",
        points: ['Article & document summarization with key-term extraction', 'Chat with any note to ask follow-up questions', 'Tag and organize by project or topic for fast recall'],
    },
    {
        icon: FaUsers,
        accent: 'yellow',
        title: 'For Teams',
        body: "Keep meeting notes and shared documents in one place everyone can search. Share a summary via a read-only link, pin what's important, and make sure decisions and action items don't get lost between meetings.",
        points: ['Shareable read-only links for any summary', 'Pin, tag, and folder notes for team-wide organization', 'Action items extracted automatically from meeting notes'],
    },
]

const Solutions = () => {
    const { token } = useSelector((state) => state.auth)

    return (
        <MarketingLayout>
            <Helmet><title>Solutions — Notewise</title></Helmet>

            <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 text-center">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full mb-6">
                    Solutions
                </span>
                <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                    Built for however <span className="font-semibold text-yellow-50">you</span> take notes
                </h1>
                <p className="text-richblack-200 text-lg max-w-2xl mx-auto">
                    Whether you're studying for an exam, reading for research, or keeping a team aligned —
                    the same tools adapt to how you work.
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
                {SOLUTIONS.map(({ icon: Icon, accent, title, body, points }) => (
                    <div key={title} className="border border-border-soft rounded-xl bg-surface p-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${accent === 'yellow' ? 'bg-yellow-50/10 text-yellow-50' : 'bg-violet-400/10 text-violet-400'}`}>
                                <Icon size={20} />
                            </div>
                            <h2 className="text-richblack-5 font-display text-xl font-semibold">{title}</h2>
                        </div>
                        <p className="text-richblack-300 leading-relaxed mb-5">{body}</p>
                        <ul className="grid sm:grid-cols-3 gap-3">
                            {points.map((point) => (
                                <li key={point} className="text-richblack-200 text-sm border-t border-border-soft pt-3">
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="border-t border-border-soft">
                <div className="max-w-4xl mx-auto px-6 py-20 text-center">
                    <h2 className="font-display text-3xl font-light text-richblack-5 mb-6">
                        Find the workflow that fits you
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

export default Solutions
