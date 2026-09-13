import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaTag, FaQuestionCircle, FaBookOpen, FaArrowRight } from 'react-icons/fa'
import MarketingLayout from './MarketingLayout.jsx'

const FAQS = [
    { q: 'How many summaries do I get for free?', a: 'The Basic plan includes 5 credits a month at no cost — enough to try text, document, and article summarization before upgrading.' },
    { q: 'What file types can I upload?', a: 'PDF, DOCX, and TXT for documents, and MP3/WAV/M4A/OGG/FLAC/WEBM (up to 10MB) for audio. Articles can be summarized by pasting a URL.' },
    { q: 'Can I share a summary with someone else?', a: "Yes — every note has a shareable read-only link you can enable or disable from the note's page, no account required to view it." },
    { q: 'Do flashcards and quizzes cost extra credits?', a: 'Flashcard and quiz generation is included on Pro and Pro Max plans as part of your monthly credit allowance.' },
]

const Resources = () => (
    <MarketingLayout>
        <Helmet><title>Resources — Notewise</title></Helmet>

        <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yellow-50 bg-yellow-50/10 px-3 py-1 rounded-full mb-6">
                Resources
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                Everything else you might <span className="font-semibold text-yellow-50">need</span>
            </h1>
            <p className="text-richblack-200 text-lg max-w-2xl mx-auto">
                Plans, answers, and reading on how to get the most out of your notes.
            </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
            <Link to="/Pricing" className="group border border-border-soft rounded-xl bg-surface p-6 hover:border-yellow-50/40 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-yellow-50/10 text-yellow-50 flex items-center justify-center mb-4">
                    <FaTag size={18} />
                </div>
                <h2 className="text-richblack-5 font-semibold mb-2 flex items-center gap-2">
                    Pricing <FaArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <p className="text-richblack-300 text-sm">Compare Basic, Pro, and Pro Max, and find the plan that fits how you study.</p>
            </Link>

            <Link to="/HelpCenter" className="group border border-border-soft rounded-xl bg-surface p-6 hover:border-violet-400/40 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-violet-400/10 text-violet-400 flex items-center justify-center mb-4">
                    <FaQuestionCircle size={18} />
                </div>
                <h2 className="text-richblack-5 font-semibold mb-2 flex items-center gap-2">
                    Help Center <FaArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <p className="text-richblack-300 text-sm">Answers to common questions, or email us directly for a bug report or feature request.</p>
            </Link>

            <div className="border border-border-soft rounded-xl bg-surface p-6">
                <div className="w-12 h-12 rounded-lg bg-yellow-50/10 text-yellow-50 flex items-center justify-center mb-4">
                    <FaBookOpen size={18} />
                </div>
                <h2 className="text-richblack-5 font-semibold mb-2">Blog</h2>
                <p className="text-richblack-300 text-sm">Tips on studying, note-taking, and getting more out of AI summaries. Coming soon.</p>
            </div>
        </div>

        <div className="border-t border-border-soft">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <h2 className="font-display text-3xl font-semibold text-richblack-5 text-center mb-10">
                    Frequently asked questions
                </h2>
                <div className="space-y-4">
                    {FAQS.map(({ q, a }) => (
                        <div key={q} className="border border-border-soft rounded-lg bg-surface p-6">
                            <h3 className="text-richblack-5 font-semibold mb-2">{q}</h3>
                            <p className="text-richblack-300 text-sm leading-relaxed">{a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </MarketingLayout>
)

export default Resources
