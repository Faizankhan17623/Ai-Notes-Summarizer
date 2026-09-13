import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'motion/react'
import { FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { ReviewFlashcard, DeleteFlashcard } from '../../Services/operations/StudyKit.js'

// flip-card study view sir — used both on the Report page (browse a note's cards) and
// wherever a due-review queue is shown. Rating buttons only appear once flipped.
const FlashcardDeck = ({ cards, noteId, allowDelete = false }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const [rawIndex, setRawIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [direction, setDirection] = useState(1)

    if (!cards || cards.length === 0) {
        return <p className="text-richblack-400 text-sm">No flashcards yet.</p>
    }

    const index = Math.min(rawIndex, cards.length - 1)
    const card = cards[index]

    const goPrev = () => {
        setFlipped(false)
        setDirection(-1)
        setRawIndex((i) => Math.max(i - 1, 0))
    }

    // wraps sir — used by "Skip for now" and after rating/deleting a card. On the Review
    // queue, rating/deleting removes the card from `cards` (see StudyKit.js ReviewFlashcard /
    // DeleteFlashcard), shifting later cards left by one, so staying at the same index already
    // surfaces the next card — next() is only needed to explicitly move forward
    const next = () => {
        setFlipped(false)
        setDirection(1)
        setRawIndex((i) => (i + 1) % cards.length)
    }

    const handleRate = (rating) => {
        dispatch(ReviewFlashcard(card._id, rating, token))
        setFlipped(false)
    }

    const handleDelete = () => {
        dispatch(DeleteFlashcard(card._id, noteId, token))
        setFlipped(false)
    }

    // only populated on the due-review queue (StudyKit.js getDueFlashcards .populate('note',
    // 'title')) sir — the Report page already knows which note it's on, so card.note there is
    // just an unpopulated id and this silently doesn't render
    const noteTitle = card.note?.title

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goPrev}
                        disabled={index === 0}
                        className="text-richblack-400 hover:text-richblack-25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1 rounded-md hover:bg-surface-hover transition-colors"
                        title="Previous card"
                        aria-label="Previous card"
                    >
                        <FaChevronLeft size={12} />
                    </button>
                    <p className="text-richblack-400 text-xs font-mono">{index + 1} / {cards.length}</p>
                    <button
                        onClick={next}
                        disabled={cards.length === 1}
                        className="text-richblack-400 hover:text-richblack-25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1 rounded-md hover:bg-surface-hover transition-colors"
                        title="Next card"
                        aria-label="Next card"
                    >
                        <FaChevronRight size={12} />
                    </button>
                    <div className="flex gap-0.5">
                        {cards.map((_, i) => (
                            <span key={i} className={`w-4 h-1 rounded-full ${i === index ? 'bg-yellow-50' : i < index ? 'bg-richblack-600' : 'bg-border-soft'}`} />
                        ))}
                    </div>
                </div>
                {allowDelete && (
                    <button onClick={handleDelete} title="Delete flashcard" aria-label="Delete flashcard" className="text-richblack-500 hover:text-danger-soft cursor-pointer">
                        <FaTrash size={12} />
                    </button>
                )}
            </div>

            {noteTitle && (
                <p className="text-richblack-300 text-xs font-medium mb-2 truncate" title={noteTitle}>
                    From: {noteTitle}
                </p>
            )}

            <div style={{ perspective: 1200 }} className="w-full min-h-[220px]">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.button
                        key={index}
                        type="button"
                        custom={direction}
                        initial={{ opacity: 0, x: 40 * direction }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 * direction }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => setFlipped((f) => !f)}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="w-full min-h-[220px] block rounded-xl cursor-pointer shadow-lg"
                    >
                        <motion.div
                            animate={{ rotateY: flipped ? 180 : 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            style={{ transformStyle: 'preserve-3d' }}
                            className="relative w-full min-h-[220px]"
                        >
                            {/* front sir */}
                            <div
                                style={{ backfaceVisibility: 'hidden' }}
                                className="absolute inset-0 flex items-center justify-center text-center rounded-xl p-8 bg-surface-raised border border-border-soft hover:border-yellow-50/50 transition-colors"
                            >
                                <p className="text-richblack-5 font-display text-xl font-semibold leading-snug">{card.front}</p>
                            </div>
                            {/* back sir — pre-rotated 180deg so it faces forward exactly when the parent finishes rotating */}
                            <div
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                className="absolute inset-0 flex items-center justify-center text-center rounded-xl p-8 bg-surface-hover border border-border-soft"
                            >
                                <p className="text-richblack-100 text-base leading-relaxed">{card.back}</p>
                            </div>
                        </motion.div>
                    </motion.button>
                </AnimatePresence>
            </div>
            <p className="text-richblack-500 text-xs text-center mt-3">Click the card to {flipped ? "see the question" : "reveal the answer"}</p>

            {flipped ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-4 gap-2 mt-4"
                >
                    <button onClick={() => handleRate('again')} className="bg-danger-soft text-richblack-900 rounded-md py-2.5 text-sm font-semibold cursor-pointer hover:scale-95 transition-all">Again</button>
                    <button onClick={() => handleRate('hard')} className="bg-warn text-richblack-900 rounded-md py-2.5 text-sm font-semibold cursor-pointer hover:scale-95 transition-all">Hard</button>
                    <button onClick={() => handleRate('good')} className="bg-yellow-50 text-richblack-900 rounded-md py-2.5 text-sm font-semibold cursor-pointer hover:scale-95 transition-all">Good</button>
                    <button onClick={() => handleRate('easy')} className="bg-good text-richblack-900 rounded-md py-2.5 text-sm font-semibold cursor-pointer hover:scale-95 transition-all">Easy</button>
                </motion.div>
            ) : (
                <button onClick={next} className="w-full mt-4 text-richblack-300 text-sm cursor-pointer hover:text-richblack-100 transition-colors">
                    Skip for now
                </button>
            )}
        </div>
    )
}

export default FlashcardDeck
