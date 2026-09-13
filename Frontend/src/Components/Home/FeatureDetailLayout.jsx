import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import MarketingLayout from './MarketingLayout.jsx'

// Shared shell for individual feature deep-dive pages (Chat, Flashcards & Quizzes,
// Spaced Repetition) sir — mirrors /Features' visual language at a single-feature depth.
const FeatureDetailLayout = ({ icon: Icon, accent = 'yellow', eyebrow, title, intro, children }) => {
    const { token } = useSelector((state) => state.auth)
    const accentText = accent === 'yellow' ? 'text-yellow-50' : 'text-violet-400'
    const accentBg = accent === 'yellow' ? 'bg-yellow-50/10' : 'bg-violet-400/10'

    return (
        <MarketingLayout>
            <Helmet><title>{eyebrow} — Notewise</title></Helmet>

            <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 text-center">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${accentText} ${accentBg} px-3 py-1 rounded-full mb-6`}>
                    Features
                </span>
                {Icon && (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6 ${accentText} ${accentBg}`}>
                        <Icon size={24} />
                    </div>
                )}
                <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                    {title}
                </h1>
                <p className="text-richblack-200 text-lg max-w-2xl mx-auto">
                    {intro}
                </p>
            </div>

            <div className="max-w-4xl mx-auto px-6 pb-24">
                {children}
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

export default FeatureDetailLayout
