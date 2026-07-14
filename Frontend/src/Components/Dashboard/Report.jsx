import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaComments, FaTrash, FaClipboardList, FaLayerGroup } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetSingleNote, DeleteNote } from '../../Services/operations/Notes.js'
import { CreateChat } from '../../Services/operations/Chat.js'
import { GenerateFlashcards, GetFlashcardsForNote, GenerateQuiz, GetQuizzesForNote } from '../../Services/operations/StudyKit.js'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'
import ActionItemsCard from './ActionItemsCard.jsx'
import FlashcardDeck from './FlashcardDeck.jsx'
import QuizPlayer from './QuizPlayer.jsx'
import NoteOrganizer from './NoteOrganizer.jsx'
import ShareExport from './ShareExport.jsx'

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
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(DeleteNote(noteId, token, navigate))
        }
    }

    return (
        <>
            <Helmet><title>{summary.title || 'Summary'} — Notewise</title></Helmet>

            <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div className="min-w-0">
                        <h1 className="font-display text-3xl font-semibold text-richblack-5 truncate">{summary.title}</h1>
                        <p className="text-richblack-400 text-sm mt-1.5">{new Date(currentNote.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <IconBtn text="Chat" outline onclick={() => dispatch(CreateChat(noteId, token, navigate))}>
                            <FaComments />
                        </IconBtn>
                        <button onClick={handleDelete} title="Delete note" className="text-richblack-400 hover:text-pink-200 p-2 cursor-pointer rounded-md hover:bg-surface-hover transition-colors">
                            <FaTrash />
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_260px] gap-8 items-start">
                    {/* main content column sir */}
                    <div className="min-w-0 space-y-6">
                        <div className="border border-border-soft bg-surface rounded-lg p-6">
                            <p className="text-xs uppercase tracking-wide text-yellow-50 font-semibold mb-2">TL;DR</p>
                            <p className="text-richblack-100 text-base leading-relaxed">{summary.tldr}</p>
                        </div>

                        <div className="border border-border-soft bg-surface rounded-lg p-6">
                            <h2 className="text-richblack-5 font-semibold mb-3">Key points</h2>
                            <ul className="space-y-2.5">
                                {summary.keyPoints?.map((point, i) => (
                                    <li key={i} className="flex gap-2.5 text-richblack-200 text-sm leading-relaxed">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-50 mt-1.5 shrink-0" />
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {summary.sections?.length > 0 && (
                            <div className="border border-border-soft bg-surface rounded-lg p-6">
                                <h2 className="text-richblack-5 font-semibold mb-4">Sections</h2>
                                <div className="space-y-5">
                                    {summary.sections.map((section, i) => (
                                        <div key={i} className={i > 0 ? "pt-5 border-t border-border-soft" : ""}>
                                            <h3 className="text-yellow-50 font-medium mb-2 text-sm">{section.heading}</h3>
                                            <ul className="space-y-1.5">
                                                {section.points?.map((p, j) => (
                                                    <li key={j} className="flex gap-2.5 text-richblack-200 text-sm leading-relaxed">
                                                        <span className="w-1 h-1 rounded-full bg-richblack-500 mt-2 shrink-0" />
                                                        {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {summary.keyTerms?.length > 0 && (
                            <div className="border border-border-soft bg-surface rounded-lg p-6">
                                <h2 className="text-richblack-5 font-semibold mb-3">Key terms</h2>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {summary.keyTerms.map((kt, i) => (
                                        <div key={i} className="bg-surface-hover rounded-md p-3">
                                            <p className="text-yellow-50 font-medium text-sm">{kt.term}</p>
                                            <p className="text-richblack-300 text-xs mt-1 leading-relaxed">{kt.meaning}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <ActionItemsCard actionItems={summary.actionItems} />

                        {/* study tools sir — visually separated from the read summary above,
                            these are interactive on-demand tools, not passive content */}
                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px flex-1 bg-border-soft" />
                                <span className="text-xs uppercase tracking-wide text-richblack-500 font-semibold">Study tools</span>
                                <div className="h-px flex-1 bg-border-soft" />
                            </div>

                            <div className="space-y-6">
                                <div className="border border-border-soft bg-surface-raised rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-richblack-5 font-semibold flex items-center gap-2">
                                            <FaLayerGroup className="text-yellow-50" size={14} /> Flashcards
                                        </h2>
                                        {isPaidPlan ? (
                                            <IconBtn text="Generate more" outline onclick={() => dispatch(GenerateFlashcards(noteId, 10, token))} />
                                        ) : (
                                            <Link to="/Pricing" className="text-yellow-50 text-xs">Upgrade to generate flashcards</Link>
                                        )}
                                    </div>
                                    <FlashcardDeck cards={flashcards} noteId={noteId} allowDelete />
                                </div>

                                <div className="border border-border-soft bg-surface-raised rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-richblack-5 font-semibold flex items-center gap-2">
                                            <FaClipboardList className="text-yellow-50" size={14} /> Quiz
                                        </h2>
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
                    </div>

                    {/* right rail sir — note meta + share/export, sticky so it stays in view
                        while the (often much longer) main content scrolls past */}
                    <aside className="lg:sticky lg:top-6 space-y-6">
                        <div className="border border-border-soft bg-surface rounded-lg p-5">
                            <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold mb-4">Organize</p>
                            <NoteOrganizer note={currentNote} />
                        </div>
                        <div className="border border-border-soft bg-surface rounded-lg p-5">
                            <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold mb-4">Share &amp; export</p>
                            <ShareExport note={currentNote} />
                        </div>
                    </aside>
                </div>
            </div>
        </>
    )
}

export default Report
