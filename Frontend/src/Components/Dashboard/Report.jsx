import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaComments, FaTrash, FaClipboardList, FaLayerGroup, FaDownload } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetSingleNote, DeleteNote, GetRelatedNotes } from '../../Services/operations/Notes.js'
import { setRelatedNotes } from '../../Slices/notesSlice.js'
import { CreateChat } from '../../Services/operations/Chat.js'
import { GenerateFlashcards, GetFlashcardsForNote, GenerateQuiz, GetQuizzesForNote, ExportFlashcardDeck, ExportQuiz } from '../../Services/operations/StudyKit.js'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'
import ActionItemsCard from './ActionItemsCard.jsx'
import FlashcardDeck from './FlashcardDeck.jsx'
import QuizPlayer from './QuizPlayer.jsx'
import NoteOrganizer from './NoteOrganizer.jsx'
import ShareExport from './ShareExport.jsx'
import RelatedNotes from './RelatedNotes.jsx'
import NoteVersionHistory from './NoteVersionHistory.jsx'
import { formatReadingTime } from '../../utils/readingTime.js'

const Report = () => {
    const { noteId } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token, user } = useSelector((state) => state.auth)
    const { currentNote, relatedNotes } = useSelector((state) => state.notes)
    const { flashcards, quizzes, activeQuiz } = useSelector((state) => state.studyKit)

    const isPaidPlan = user?.SubType && user.SubType !== 'Basic'

    useEffect(() => {
        dispatch(setRelatedNotes([]))
        dispatch(GetSingleNote(noteId, token))
        dispatch(GetFlashcardsForNote(noteId, token))
        dispatch(GetQuizzesForNote(noteId, token))
        dispatch(GetRelatedNotes(noteId, token))
    }, [dispatch, noteId, token])

    // only gate on !currentNote sir — `loading` is a flag shared across every notes
    // operation (summarize/fetch/delete/export), so gating on it here could unmount
    // this whole page (and the Chat button's captured `navigate`) mid-click if some
    // unrelated notes action starts loading while the note itself is already showing
    if (!currentNote) return <Loading text="Loading summary..." />

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
                        <p className="text-richblack-400 text-sm mt-1.5">
                            {new Date(currentNote.createdAt).toLocaleString()}
                            {currentNote.rawText && <> · {formatReadingTime(currentNote.rawText)}</>}
                        </p>
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

                        {/* article-only sir — image URLs Tavily pulled from the source page; broken/
                            hotlink-blocked ones remove themselves via onError instead of showing
                            broken-image icons */}
                        {currentNote.images?.length > 0 && (
                            <div className="border border-border-soft bg-surface rounded-lg p-6">
                                <h2 className="text-richblack-5 font-semibold mb-4">Images from the article</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {currentNote.images.map((src, i) => (
                                        <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block">
                                            <img
                                                src={src}
                                                alt={`From the article (${i + 1})`}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.currentTarget.closest('a').style.display = 'none' }}
                                                className="w-full h-32 object-cover rounded-md border border-border-soft hover:opacity-90 transition-opacity"
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                        <div className="flex items-center gap-2">
                                            {flashcards.length > 0 && (
                                                <button
                                                    onClick={() => dispatch(ExportFlashcardDeck(noteId, summary.title, token))}
                                                    title="Download deck as PDF"
                                                    aria-label="Download flashcard deck as PDF"
                                                    className="text-richblack-400 hover:text-yellow-50 p-1.5 cursor-pointer rounded-md hover:bg-surface-hover transition-colors"
                                                >
                                                    <FaDownload size={12} />
                                                </button>
                                            )}
                                            {isPaidPlan ? (
                                                <IconBtn text="Generate more" outline onclick={() => dispatch(GenerateFlashcards(noteId, 10, token))} />
                                            ) : (
                                                <Link to="/Pricing" className="text-yellow-50 text-xs">Upgrade to generate flashcards</Link>
                                            )}
                                        </div>
                                    </div>
                                    <FlashcardDeck cards={flashcards} noteId={noteId} allowDelete />
                                </div>

                                <div className="border border-border-soft bg-surface-raised rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-richblack-5 font-semibold flex items-center gap-2">
                                            <FaClipboardList className="text-yellow-50" size={14} /> Quiz
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            {latestQuiz && (
                                                <button
                                                    onClick={() => dispatch(ExportQuiz(latestQuiz._id, summary.title, token))}
                                                    title="Download quiz as PDF"
                                                    aria-label="Download quiz as PDF"
                                                    className="text-richblack-400 hover:text-yellow-50 p-1.5 cursor-pointer rounded-md hover:bg-surface-hover transition-colors"
                                                >
                                                    <FaDownload size={12} />
                                                </button>
                                            )}
                                            {isPaidPlan ? (
                                                <IconBtn text="Generate new quiz" outline onclick={() => dispatch(GenerateQuiz(noteId, 8, token))} />
                                            ) : (
                                                <Link to="/Pricing" className="text-yellow-50 text-xs">Upgrade to generate quizzes</Link>
                                            )}
                                        </div>
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
                        <NoteVersionHistory note={currentNote} />
                        <div className="border border-border-soft bg-surface rounded-lg p-5">
                            <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold mb-4">Share &amp; export</p>
                            <ShareExport note={currentNote} />
                        </div>
                        <RelatedNotes notes={relatedNotes} />
                    </aside>
                </div>
            </div>
        </>
    )
}

export default Report
