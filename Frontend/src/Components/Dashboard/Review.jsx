import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaClipboardCheck, FaCheckCircle } from 'react-icons/fa'
import { GetDueFlashcards, ExportReviewQueue } from '../../Services/operations/StudyKit.js'
import IconBtn from '../extra/IconBtn.jsx'
import FlashcardDeck from './FlashcardDeck.jsx'

// cross-note spaced-repetition review queue sir — everything due right now, across every note
const Review = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { dueFlashcards, loading } = useSelector((state) => state.studyKit)

    useEffect(() => {
        dispatch(GetDueFlashcards(token))
    }, [dispatch, token])

    return (
        <>
            <Helmet><title>Review — Notewise</title></Helmet>

            <div className="max-w-2xl mx-auto px-6 py-10">
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-richblack-5">Flashcard review</h1>
                        <p className="text-richblack-400 text-sm mt-1.5">
                            {dueFlashcards.length > 0
                                ? `${dueFlashcards.length} card${dueFlashcards.length === 1 ? '' : 's'} due across all your notes`
                                : 'Cards due for review across all your notes right now'}
                        </p>
                    </div>
                    <IconBtn
                        text="Export as PDF"
                        outline
                        disabled={dueFlashcards.length === 0}
                        onclick={() => dispatch(ExportReviewQueue(token))}
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : dueFlashcards.length === 0 ? (
                    <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                        <FaCheckCircle className="text-good text-3xl mx-auto mb-4" />
                        <p className="text-richblack-100 font-medium mb-1.5">You're all caught up</p>
                        <p className="text-richblack-400 text-sm max-w-xs mx-auto">Generate flashcards from a note's summary page to build your review queue.</p>
                    </div>
                ) : (
                    <div className="border border-border-soft bg-surface rounded-lg p-6 md:p-8">
                        <div className="flex items-center gap-2 text-richblack-400 text-xs uppercase tracking-wide font-semibold mb-6">
                            <FaClipboardCheck className="text-yellow-50" size={12} />
                            Study session
                        </div>
                        <FlashcardDeck cards={dueFlashcards} />
                    </div>
                )}
            </div>
        </>
    )
}

export default Review
