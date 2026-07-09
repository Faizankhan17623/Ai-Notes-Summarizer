import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaTrash } from 'react-icons/fa'
import { ReviewFlashcard, DeleteFlashcard } from '../../Services/operations/StudyKit.js'

// flip-card study view sir — used both on the Report page (browse a note's cards) and
// wherever a due-review queue is shown. Rating buttons only appear once flipped.
const FlashcardDeck = ({ cards, noteId, allowDelete = false }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)

    if (!cards || cards.length === 0) {
        return <p className="text-richblack-400 text-sm">No flashcards yet.</p>
    }

    const card = cards[Math.min(index, cards.length - 1)]

    const next = () => {
        setFlipped(false)
        setIndex((i) => (i + 1) % cards.length)
    }

    const handleRate = (rating) => {
        dispatch(ReviewFlashcard(card._id, rating, token))
        next()
    }

    const handleDelete = () => {
        dispatch(DeleteFlashcard(card._id, noteId, token))
        next()
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-richblack-400 text-xs">{index + 1} / {cards.length}</p>
                {allowDelete && (
                    <button onClick={handleDelete} className="text-richblack-500 hover:text-pink-200 cursor-pointer">
                        <FaTrash size={12} />
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="w-full min-h-[160px] flex items-center justify-center text-center bg-richblack-800 border border-richblack-700 rounded-lg p-6 cursor-pointer hover:border-yellow-50 transition-all"
            >
                <p className={flipped ? "text-richblack-200" : "text-richblack-5 font-medium"}>
                    {flipped ? card.back : card.front}
                </p>
            </button>
            <p className="text-richblack-500 text-xs text-center mt-2">Click the card to {flipped ? "see the question" : "reveal the answer"}</p>

            {flipped ? (
                <div className="grid grid-cols-4 gap-2 mt-4">
                    <button onClick={() => handleRate('again')} className="bg-pink-200 text-richblack-900 rounded-md py-2 text-sm font-semibold cursor-pointer">Again</button>
                    <button onClick={() => handleRate('hard')} className="bg-yellow-100 text-richblack-900 rounded-md py-2 text-sm font-semibold cursor-pointer">Hard</button>
                    <button onClick={() => handleRate('good')} className="bg-yellow-50 text-richblack-900 rounded-md py-2 text-sm font-semibold cursor-pointer">Good</button>
                    <button onClick={() => handleRate('easy')} className="bg-caribbeangreen-300 text-richblack-900 rounded-md py-2 text-sm font-semibold cursor-pointer">Easy</button>
                </div>
            ) : (
                <button onClick={next} className="w-full mt-4 text-richblack-300 text-sm cursor-pointer">
                    Skip for now
                </button>
            )}
        </div>
    )
}

export default FlashcardDeck
