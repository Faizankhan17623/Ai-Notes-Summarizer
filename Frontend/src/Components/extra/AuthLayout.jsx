import { Link } from 'react-router-dom'
import { FaBolt } from 'react-icons/fa'

const AuthLayout = ({ title, subtitle, children, footer }) => (
    <div className="min-h-screen grid lg:grid-cols-2 bg-richblack-900">
        <div className="hidden lg:flex flex-col justify-between border-r border-border-soft bg-surface/40 px-12 py-12">
            <Link to="/" className="font-display text-xl font-semibold text-yellow-50">
                AI Notes Summarizer
            </Link>
            <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yellow-50 bg-yellow-50/10 px-3 py-1 rounded-full mb-6">
                    <FaBolt size={10} /> Powered by AI
                </span>
                <h2 className="font-display text-3xl font-light leading-tight text-richblack-5 mb-4">
                    Messy notes in.<br />A clear <span className="font-semibold text-yellow-50">summary</span> out.
                </h2>
                <p className="text-richblack-300 max-w-sm">
                    Summaries, flashcards, quizzes and a chat partner that knows exactly what's in your notes.
                </p>
            </div>
            <p className="text-richblack-500 text-xs">© {new Date().getFullYear()} AI Notes Summarizer</p>
        </div>

        <div className="flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <Link to="/" className="lg:hidden font-display text-xl font-semibold text-yellow-50 mb-8 inline-block">
                    AI Notes Summarizer
                </Link>
                <div className="border border-border-soft bg-surface rounded-lg p-8">
                    <h1 className="font-display text-2xl font-semibold text-richblack-5 mb-1">{title}</h1>
                    {subtitle && <p className="text-richblack-300 text-sm mb-6">{subtitle}</p>}
                    {!subtitle && <div className="mb-6" />}
                    {children}
                </div>
                {footer && <div className="text-center mt-6">{footer}</div>}
            </div>
        </div>
    </div>
)

export default AuthLayout
