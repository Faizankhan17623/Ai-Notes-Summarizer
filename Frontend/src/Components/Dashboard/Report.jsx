import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaComments, FaTrash } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetSingleNote, DeleteNote } from '../../Services/operations/Notes.js'
import { CreateChat } from '../../Services/operations/Chat.js'
import { GenerateFlashcards, GetFlashcardsForNote, GenerateQuiz, GetQuizzesForNote } from '../../Services/operations/StudyKit.js'
import Navbar from '../Home/Navbar.jsx'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'
import ActionItemsCard from './ActionItemsCard.jsx'
import FlashcardDeck from './FlashcardDeck.jsx'
import QuizPlayer from './QuizPlayer.jsx'

const Report = () => {
    const { noteId } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token, user } = useSelector((state) => state.auth)
    const { currentNote, loading } = useSelector((state) => state.notes)
    const { flashcards, quizzes, activeQuiz } = useSelector((state) => state.studyKit)

    const isPaidPlan = user?.SubType && user.SubType !== 'Basic'

    useEffect(() => {
        dispatch(GetSingleNote(noteId, token))
        dispatch(GetFlashcardsForNote(noteId, token))
        dispatch(GetQuizzesForNote(noteId, token))
    }, [dispatch, noteId, token])

    if (loading || !currentNote) return <Loading text="Loading summary..." />

    const summary = currentNote.summary || {}
    const latestQuiz = activeQuiz || quizzes[0]

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'Delete this note?',
            text: 'This also deletes any chats grounded in it.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: '#161D29',
            color: '#F1F2FF',
        })
        if (result.isConfirmed) {
            dispatch(DeleteNote(noteId, token, navigate))
        }
    }

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>{summary.title || 'Summary'} — AI Notes Summarizer</title></Helmet>
            <Navbar />

            <div className="max-w-3xl mx-auto px-6 py-12">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-richblack-5">{summary.title}</h1>
                        <p className="text-richblack-400 text-sm mt-1">{new Date(currentNote.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                        <IconBtn text="Chat" outline onclick={() => dispatch(CreateChat(noteId, token, navigate))}>
                            <FaComments />
                        </IconBtn>
                        <button onClick={handleDelete} title="Delete note" className="text-richblack-400 hover:text-pink-200 p-2 cursor-pointer">
                            <FaTrash />
                        </button>
                    </div>
                </div>

                <div className="border border-richblack-700 rounded-lg p-6 mb-6">
                    <h2 className="text-richblack-5 font-semibold mb-2">TL;DR</h2>
                    <p className="text-richblack-200">{summary.tldr}</p>
                </div>

                <div className="border border-richblack-700 rounded-lg p-6 mb-6">
                    <h2 className="text-richblack-5 font-semibold mb-3">Key points</h2>
                    <ul className="list-disc list-inside space-y-2 text-richblack-200">
                        {summary.keyPoints?.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>

                {summary.sections?.length > 0 && (
                    <div className="border border-richblack-700 rounded-lg p-6 mb-6">
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
                    <div className="border border-richblack-700 rounded-lg p-6 mb-6">
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

                {/* Flashcards sir — standalone cards generated on-demand, independent of the initial summary */}
                <div className="border border-richblack-700 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-richblack-5 font-semibold">Flashcards</h2>
                        {isPaidPlan ? (
                            <IconBtn text="Generate more" outline onclick={() => dispatch(GenerateFlashcards(noteId, 10, token))} />
                        ) : (
                            <Link to="/Pricing" className="text-yellow-50 text-xs">Upgrade to generate flashcards</Link>
                        )}
                    </div>
                    <FlashcardDeck cards={flashcards} noteId={noteId} allowDelete />
                </div>

                {/* Quiz sir — same on-demand pattern, one active quiz shown at a time (most recent) */}
                <div className="border border-richblack-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-richblack-5 font-semibold">Quiz</h2>
                        {isPaidPlan ? (
                            <IconBtn text="Generate new quiz" outline onclick={() => dispatch(GenerateQuiz(noteId, 8, token))} />
                        ) : (
                            <Link to="/Pricing" className="text-yellow-50 text-xs">Upgrade to generate quizzes</Link>
                        )}
                    </div>
                    {latestQuiz ? <QuizPlayer key={latestQuiz._id} quiz={latestQuiz} /> : (
                        <p className="text-richblack-400 text-sm">No quiz yet — generate one above.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Report
