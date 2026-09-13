import { Helmet } from 'react-helmet-async'
import { FaEnvelope, FaBug, FaLightbulb } from 'react-icons/fa'
import MarketingLayout from './MarketingLayout.jsx'

const SUPPORT_EMAIL = 'faizankhan901152@gmail.com'

const TOPICS = [
    {
        icon: FaBug,
        accent: 'yellow',
        title: 'Report a bug',
        body: "Something not working the way it should? Tell us what you were doing, what you expected, and what happened instead — screenshots help a lot.",
        subject: 'Bug report',
    },
    {
        icon: FaLightbulb,
        accent: 'violet',
        title: 'Request a feature',
        body: "Have an idea that would make Notewise more useful for how you take notes or study? We read every suggestion.",
        subject: 'Feature request',
    },
    {
        icon: FaEnvelope,
        accent: 'yellow',
        title: 'General question',
        body: "Anything else — billing, your account, or how something works — reach out directly and we'll get back to you.",
        subject: 'General question',
    },
]

const HELP_TOPICS = [
    { q: 'How do I upgrade or downgrade my plan?', a: 'Go to Pricing and select the plan you want. Upgrades take effect immediately; if payments are still in "coming soon" mode, your account is already gated correctly for when they go live.' },
    { q: 'Why did my summary fail?', a: 'The most common causes are: text under 20 characters (too short to summarize), an unsupported file type, or running out of monthly credits. The error message on screen will tell you which one applies.' },
    { q: 'How do I delete my account?', a: 'From Account settings, choose to delete your account. There is a 2-day recovery window before it is permanently removed — you can log back in during that window to cancel the deletion.' },
    { q: 'Can I export a summary?', a: 'Yes — open any note and export it as Markdown, PDF, or DOCX from the note page.' },
    { q: 'Is my data private?', a: "Your notes are only visible to you unless you explicitly enable a share link for a specific note, which you can disable at any time." },
]

const HelpCenter = () => (
    <MarketingLayout>
        <Helmet><title>Help Center — Notewise</title></Helmet>

        <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full mb-6">
                Help Center
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                How can we <span className="font-semibold text-yellow-50">help</span>?
            </h1>
            <p className="text-richblack-200 text-lg max-w-2xl mx-auto">
                Found a bug, have an idea, or just have a question? Reach out directly — every message
                goes straight to the person building Notewise.
            </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
            {TOPICS.map(({ icon: Icon, accent, title, body, subject }) => (
                <a
                    key={title}
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Notewise — ${subject}`)}`}
                    className={`group border border-border-soft rounded-xl bg-surface p-6 transition-colors ${accent === 'yellow' ? 'hover:border-yellow-50/40' : 'hover:border-violet-400/40'}`}
                >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${accent === 'yellow' ? 'bg-yellow-50/10 text-yellow-50' : 'bg-violet-400/10 text-violet-400'}`}>
                        <Icon size={18} />
                    </div>
                    <h2 className="text-richblack-5 font-semibold mb-2">{title}</h2>
                    <p className="text-richblack-300 text-sm">{body}</p>
                </a>
            ))}
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-20">
            <div className="border border-yellow-50/30 bg-yellow-50/5 rounded-xl p-6 text-center">
                <p className="text-richblack-200 text-sm mb-3">
                    Prefer to email directly? Write to us at:
                </p>
                <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-yellow-50 font-semibold text-lg hover:underline break-all"
                >
                    {SUPPORT_EMAIL}
                </a>
            </div>
        </div>

        <div className="border-t border-border-soft">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <h2 className="font-display text-3xl font-semibold text-richblack-5 text-center mb-10">
                    Common questions
                </h2>
                <div className="space-y-4">
                    {HELP_TOPICS.map(({ q, a }) => (
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

export default HelpCenter
