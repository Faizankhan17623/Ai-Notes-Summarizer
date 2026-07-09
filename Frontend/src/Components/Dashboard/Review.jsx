import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { GetDueFlashcards } from '../../Services/operations/StudyKit.js'
import Navbar from '../Home/Navbar.jsx'
import Loading from '../extra/Loading.jsx'
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
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Review — AI Notes Summarizer</title></Helmet>
            <Navbar />

            <div className="max-w-xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-richblack-5 mb-1">Flashcard review</h1>
                <p className="text-richblack-400 text-sm mb-6">Cards due for review across all your notes right now.</p>

                {loading ? (
                    <Loading text="Loading due cards..." />
                ) : dueFlashcards.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-richblack-300 mb-2">Nothing due right now — you're all caught up.</p>
                        <p className="text-richblack-500 text-sm">Generate flashcards from a note's summary page to build your review queue.</p>
                    </div>
                ) : (
                    <FlashcardDeck cards={dueFlashcards} />
                )}
            </div>
        </div>
    )
}

export default Review
