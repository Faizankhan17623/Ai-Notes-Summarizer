import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
    FaFilePdf, FaMicrophone, FaComments, FaLayerGroup, FaQuestionCircle,
    FaSearch, FaFire, FaBolt,
} from 'react-icons/fa'

const FEATURES = [
    { icon: FaFilePdf, title: "Any format", body: "Paste text, upload PDF/DOCX/TXT, or type freely — we handle it all." },
    { icon: FaMicrophone, title: "Voice input", body: "Dictate your notes out loud — your voice becomes text instantly." },
    { icon: FaComments, title: "Chat with your notes", body: "Ask follow-up questions and get answers grounded in your own notes." },
    { icon: FaLayerGroup, title: "Spaced-repetition flashcards", body: "Generate flashcards from any note and review them on a schedule that adapts to you." },
    { icon: FaQuestionCircle, title: "On-demand quizzes", body: "Turn any note into a scored multiple-choice quiz with explanations." },
    { icon: FaSearch, title: "Search & organize", body: "Tag, fold into folders, pin what matters, and find anything instantly." },
]

const STEPS = [
    { step: "01", title: "Bring your notes", body: "Paste text, upload a file, or talk — whatever's fastest for you right now." },
    { step: "02", title: "Get a structured summary", body: "TL;DR, key points, action items and tags appear in seconds, ready to use." },
    { step: "03", title: "Study and revisit", body: "Chat with the note, generate flashcards or a quiz, and track your streak over time." },
]

const PLANS = [
    { name: "Basic", price: "Free", blurb: "Key points + structured action items", credits: "5 credits / mo" },
    { name: "Pro", price: "₹499/mo", blurb: "+ Sections & key terms", credits: "100 credits / mo", featured: true },
    { name: "Pro Max", price: "₹1499/mo", blurb: "+ Quiz & flashcards on every summary", credits: "Unlimited credits" },
]

const Banner = () => {
    const { token } = useSelector((state) => state.auth)

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
                        {FEATURES.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="border border-border-soft rounded-lg p-6 bg-surface hover:border-yellow-50/40 transition-colors">
                                <Icon className="text-yellow-50 text-2xl mb-3" />
                                <h3 className="text-richblack-5 font-semibold mb-2">{title}</h3>
                                <p className="text-richblack-300 text-sm">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="font-display text-3xl font-semibold text-richblack-5 mb-3">How it works</h2>
                    <p className="text-richblack-300">Three steps from raw notes to something you'll actually use.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {STEPS.map(({ step, title, body }) => (
                        <div key={step} className="relative">
                            <span className="font-mono text-4xl font-bold text-yellow-50/20">{step}</span>
                            <h3 className="text-richblack-5 font-semibold mt-2 mb-2">{title}</h3>
                            <p className="text-richblack-300 text-sm leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Plans teaser */}
            <div className="border-t border-border-soft bg-surface/40">
                <div className="max-w-6xl mx-auto px-6 py-20">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="font-display text-3xl font-semibold text-richblack-5 mb-3">Pick a plan that fits how you study</h2>
                        <p className="text-richblack-300">Start free. Upgrade whenever you need more depth or more credits.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {PLANS.map((plan) => (
                            <div
                                key={plan.name}
                                className={`rounded-lg p-6 border ${plan.featured
                                    ? "border-yellow-50/50 bg-surface-raised"
                                    : "border-border-soft bg-surface"
                                    }`}
                            >
                                {plan.featured && (
                                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-yellow-50 bg-yellow-50/10 px-2 py-0.5 rounded-full mb-3">
                                        Most popular
                                    </span>
                                )}
                                <h3 className="text-richblack-5 font-semibold text-lg mb-1">{plan.name}</h3>
                                <p className="font-mono text-2xl text-richblack-5 mb-3">{plan.price}</p>
                                <p className="text-richblack-300 text-sm mb-1">{plan.blurb}</p>
                                <p className="text-richblack-400 text-xs">{plan.credits}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-10">
                        <Link
                            to="/Pricing"
                            className="inline-block border border-yellow-50 text-yellow-50 px-8 py-3 rounded-md font-semibold hover:bg-yellow-50/10 transition-colors"
                        >
                            Compare all plans
                        </Link>
                    </div>
                </div>
            </div>

            {/* Closing CTA */}
            <div className="max-w-4xl mx-auto px-6 py-24 text-center">
                <FaFire className="text-yellow-50 text-3xl mx-auto mb-4" />
                <h2 className="font-display text-3xl md:text-4xl font-light text-richblack-5 mb-4">
                    Stop re-reading. Start <span className="font-semibold text-yellow-50">remembering</span>.
                </h2>
                <p className="text-richblack-300 mb-8 max-w-lg mx-auto">
                    It takes less than a minute to turn your first set of notes into something worth keeping.
                </p>
                <Link
                    to={token ? "/Dashboard/New-Summary" : "/Signup"}
                    className="inline-block bg-yellow-50 text-richblack-900 px-8 py-3 rounded-md font-semibold hover:scale-95 transition-all"
                >
                    {token ? "Summarize your notes" : "Get started for free"}
                </Link>
            </div>
        </div>
    )
}

export default Banner
