import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { GetSharedNote } from '../../Services/operations/Notes.js'
import Loading from '../extra/Loading.jsx'
import ActionItemsCard from './ActionItemsCard.jsx'

// public, no-auth view sir — summary only, matches exactly what GET /shared/:shareId returns
const SharedNote = () => {
    const { shareId } = useParams()
    const dispatch = useDispatch()
    const { currentNote, loading } = useSelector((state) => state.notes)

    useEffect(() => {
        dispatch(GetSharedNote(shareId))
    }, [dispatch, shareId])

    if (loading) return <Loading text="Loading shared note..." />

    if (!currentNote) {
        return (
            <div className="min-h-screen bg-richblack-900 flex flex-col items-center justify-center px-6 text-center">
                <p className="text-richblack-200 mb-4">This share link is invalid or has been disabled.</p>
                <Link to="/" className="text-yellow-50">Go home</Link>
            </div>
        )
    }

    const summary = currentNote.summary || {}

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>{summary.title || 'Shared note'} — AI Notes Summarizer</title></Helmet>

            <div className="max-w-3xl mx-auto px-6 py-12">
                <p className="text-richblack-400 text-xs mb-2">Shared summary · <Link to="/" className="text-yellow-50">AI Notes Summarizer</Link></p>
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">{summary.title}</h1>

                <div className="border border-border-soft bg-surface rounded-lg p-6 mb-6">
                    <h2 className="text-richblack-5 font-semibold mb-2">TL;DR</h2>
                    <p className="text-richblack-200">{summary.tldr}</p>
                </div>

                <div className="border border-border-soft bg-surface rounded-lg p-6 mb-6">
                    <h2 className="text-richblack-5 font-semibold mb-3">Key points</h2>
                    <ul className="list-disc list-inside space-y-2 text-richblack-200">
                        {summary.keyPoints?.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>

                {summary.sections?.length > 0 && (
                    <div className="border border-border-soft bg-surface rounded-lg p-6 mb-6">
                        <h2 className="text-richblack-5 font-semibold mb-3">Sections</h2>
                        <div className="space-y-4">
                            {summary.sections.map((section, i) => (
                                <div key={i}>
                                    <h3 className="text-yellow-50 font-medium mb-1">{section.heading}</h3>
                                    <ul className="list-disc list-inside space-y-1 text-richblack-200 text-sm">
                                        {section.points?.map((p, j) => <li key={j}>{p}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {summary.keyTerms?.length > 0 && (
                    <div className="border border-border-soft bg-surface rounded-lg p-6 mb-6">
                        <h2 className="text-richblack-5 font-semibold mb-3">Key terms</h2>
                        <div className="space-y-3">
                            {summary.keyTerms.map((kt, i) => (
                                <div key={i}>
                                    <span className="text-yellow-50 font-medium">{kt.term}</span>
                                    <span className="text-richblack-200 text-sm"> — {kt.meaning}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <ActionItemsCard actionItems={summary.actionItems} />
            </div>
        </div>
    )
}

export default SharedNote
