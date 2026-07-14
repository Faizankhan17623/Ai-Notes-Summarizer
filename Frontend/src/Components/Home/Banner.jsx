import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
    FaFilePdf, FaMicrophone, FaComments, FaLayerGroup, FaQuestionCircle,
    FaSearch, FaBolt,
} from 'react-icons/fa'
import SummarizerHero from './SummarizerHero.jsx'
import SummarizerExplainer from './SummarizerExplainer.jsx'
import SummarizerHowItWorks from './SummarizerHowItWorks.jsx'
import SummarizerUseCases from './SummarizerUseCases.jsx'
import SummarizerWhyUse from './SummarizerWhyUse.jsx'
import SummarizerWhoBenefits from './SummarizerWhoBenefits.jsx'
import SummarizerFaqs from './SummarizerFaqs.jsx'

const FEATURES = [
    { icon: FaFilePdf, title: "Any format", body: "Paste text, upload PDF/DOCX/TXT, or type freely — we handle it all." },
    { icon: FaMicrophone, title: "Voice input", body: "Dictate your notes out loud — your voice becomes text instantly." },
    { icon: FaComments, title: "Chat with your notes", body: "Ask follow-up questions and get answers grounded in your own notes." },
    { icon: FaLayerGroup, title: "Spaced-repetition flashcards", body: "Generate flashcards from any note and review them on a schedule that adapts to you." },
    { icon: FaQuestionCircle, title: "On-demand quizzes", body: "Turn any note into a scored multiple-choice quiz with explanations." },
    { icon: FaSearch, title: "Search & organize", body: "Tag, fold into folders, pin what matters, and find anything instantly." },
]

const Banner = () => {
    const { token } = useSelector((state) => state.auth)
    const [summarizerTab, setSummarizerTab] = useState('text')

    return (
        <div>
            <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
                    <div>
                        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yellow-50 bg-yellow-50/10 px-3 py-1 rounded-full mb-6">
                            <FaBolt size={10} /> Powered by AI
                        </span>
                        <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                            Messy notes in.<br />A clear <span className="font-semibold text-yellow-50">summary</span> out.
                        </h1>
                        <p className="text-richblack-200 text-lg mb-8 max-w-xl">
                            Paste text, upload a PDF/Word/TXT file, or just talk — our AI reads your meeting notes,
                            lecture notes or freeform thoughts and gives you a structured summary, key points, and a chat
                            partner who knows exactly what's in them.
                        </p>

                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                to={token ? "/Dashboard/New-Summary" : "/Signup"}
                                className="inline-block bg-yellow-50 text-richblack-900 px-8 py-3 rounded-md font-semibold hover:scale-95 transition-all"
                            >
                                {token ? "Summarize your notes" : "Get started for free"}
                            </Link>
                            <Link
                                to="/Pricing"
                                className="inline-block border border-border-soft text-richblack-100 px-8 py-3 rounded-md font-semibold hover:bg-surface-hover transition-colors"
                            >
                                See pricing
                            </Link>
                        </div>
                    </div>

                    <div className="border border-border-soft rounded-xl bg-surface-raised p-1.5">
                        <div className="rounded-lg bg-surface p-5">
                            <div className="flex gap-1.5 mb-4">
                                <span className="w-2 h-2 rounded-full bg-border-soft" />
                                <span className="w-2 h-2 rounded-full bg-border-soft" />
                                <span className="w-2 h-2 rounded-full bg-border-soft" />
                            </div>
                            <div className="h-2 rounded bg-border-soft w-4/5 mb-2" />
                            <div className="h-2 rounded bg-border-soft w-full mb-2" />
                            <div className="h-2 rounded bg-border-soft w-3/5 mb-4" />
                            <div className="border border-yellow-50/30 bg-yellow-50/10 rounded-lg p-4">
                                <span className="block text-[10px] uppercase tracking-wide text-yellow-50 font-semibold mb-2">TL;DR</span>
                                <p className="text-richblack-200 text-sm leading-relaxed">
                                    Q3 roadmap prioritizes the mobile app rewrite before the billing overhaul; design review moved to Thursday.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="border-t border-border-soft bg-surface/40">
                <div className="max-w-6xl mx-auto px-6 py-20">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="font-display text-3xl font-semibold text-richblack-5 mb-3">
                            Everything you need to actually remember what you read
                        </h2>
                        <p className="text-richblack-300">
                            Not just a summarizer — a full study companion for your notes.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 text-left">
                        {FEATURES.map(({ icon: Icon, title, body }, i) => (
                            <div key={title} className={`border border-border-soft rounded-lg p-6 bg-surface transition-colors ${i % 2 === 0 ? "hover:border-yellow-50/40" : "hover:border-violet-400/40"}`}>
                                <Icon className={`text-2xl mb-3 ${i % 2 === 0 ? "text-yellow-50" : "text-violet-400"}`} />
                                <h3 className="text-richblack-5 font-semibold mb-2">{title}</h3>
                                <p className="text-richblack-300 text-sm">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Interactive summarizer */}
            <div className="border-t border-border-soft">
                <SummarizerHero tab={summarizerTab} setTab={setSummarizerTab} />
            </div>

            {/* Summarizer explainer — mirrors the selected tab above */}
            <div className="border-t border-border-soft bg-surface/40">
                <SummarizerExplainer tab={summarizerTab} />
            </div>

            {/* How it works — mirrors the selected tab above, deliberately light-themed per the reference design */}
            <SummarizerHowItWorks tab={summarizerTab} />

            {/* Use cases — same light theme, right below How It Works */}
            <SummarizerUseCases tab={summarizerTab} />

            {/* Why use it — benefits grid, same light theme, right below use cases */}
            <SummarizerWhyUse tab={summarizerTab} />

            {/* Who benefits — audience cards, same light theme, right below Why Use */}
            <SummarizerWhoBenefits tab={summarizerTab} />

            {/* FAQs — accordion, same light theme, questions unique per tab */}
            <SummarizerFaqs tab={summarizerTab} />
        </div>
    )
}

export default Banner
