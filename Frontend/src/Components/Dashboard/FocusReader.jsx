import { useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'
import { formatReadingTime } from '../../utils/readingTime.js'

// Distraction-free reading view for a note's summary sir — strips the dashboard chrome
// (sidebar, action buttons, study tools) down to just the readable content, inheriting
// whatever light/dark theme the user already has set via data-theme on <html>.
const FocusReader = ({ note, onClose }) => {
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKeyDown)
        // lock background scroll while the overlay is open sir
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = prevOverflow
        }
    }, [onClose])

    const summary = note.summary || {}

    return (
        <div className="fixed inset-0 z-50 bg-richblack-900 overflow-y-auto">
            <button
                type="button"
                onClick={onClose}
                title="Exit focus mode (Esc)"
                className="fixed top-5 right-5 z-10 text-richblack-400 hover:text-richblack-5 p-2.5 rounded-full bg-surface hover:bg-surface-hover border border-border-soft transition-colors cursor-pointer"
            >
                <FaTimes size={16} />
            </button>

            <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
                <h1 className="font-display text-3xl md:text-4xl font-semibold text-richblack-5 leading-tight">
                    {summary.title}
                </h1>
                <p className="text-richblack-400 text-sm mt-3 mb-12">
                    {new Date(note.createdAt).toLocaleDateString()}
                    {note.rawText && <> · {formatReadingTime(note.rawText)}</>}
                </p>

                <div className="space-y-10 text-[17px] leading-[1.8] text-richblack-100">
                    {summary.tldr && <p>{summary.tldr}</p>}

                    {summary.keyPoints?.length > 0 && (
                        <div>
                            <h2 className="text-richblack-5 font-semibold text-lg mb-4">Key points</h2>
                            <ul className="space-y-3">
                                {summary.keyPoints.map((point, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-50 mt-3 shrink-0" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {summary.sections?.length > 0 && summary.sections.map((section, i) => (
                        <div key={i}>
                            <h2 className="text-richblack-5 font-semibold text-lg mb-3">{section.heading}</h2>
                            <ul className="space-y-3">
                                {section.points?.map((p, j) => (
                                    <li key={j} className="flex gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-richblack-500 mt-3 shrink-0" />
                                        <span>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {summary.keyTerms?.length > 0 && (
                        <div>
                            <h2 className="text-richblack-5 font-semibold text-lg mb-4">Key terms</h2>
                            <div className="space-y-4">
                                {summary.keyTerms.map((kt, i) => (
                                    <div key={i}>
                                        <p className="text-yellow-50 font-medium">{kt.term}</p>
                                        <p className="text-richblack-300 text-base mt-1">{kt.meaning}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FocusReader
