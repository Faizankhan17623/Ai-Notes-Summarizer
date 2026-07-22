import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { FaCheckCircle, FaRegCircle, FaTimes, FaComments, FaLayerGroup } from 'react-icons/fa'
import { CompleteOnboarding } from '../../Services/operations/Auth.js'

// shown once, right after signup, until dismissed sir — hasCompletedOnboarding starts false
// and a sample note is auto-created (see Backend/controllers/user.js createUser) so this
// never greets someone with a totally empty dashboard.
//
// only "create your first real summary" is a TRACKED step (derived from allNotes.length > 1,
// data DashboardHome already fetches) — Chat/Flashcards are suggestion links, not tracked
// checkmarks, since tracking those would mean extra API calls on every dashboard load just
// for this checklist
const OnboardingChecklist = ({ noteCount }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    // > 1 sir, not > 0 — the sample note itself counts as note #1, doesn't count as "done"
    const hasRealSummary = noteCount > 1

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="border border-yellow-50/40 bg-yellow-50/5 rounded-lg p-5 mb-8"
        >
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                    <h2 className="text-richblack-5 font-semibold">Get started with Notewise</h2>
                    <p className="text-richblack-300 text-sm mt-0.5">A few things to try — dismiss anytime.</p>
                </div>
                <button
                    onClick={() => dispatch(CompleteOnboarding(token))}
                    title="Dismiss"
                    aria-label="Dismiss onboarding checklist"
                    className="text-richblack-400 hover:text-richblack-5 cursor-pointer p-1 rounded-md hover:bg-surface-hover transition-colors shrink-0"
                >
                    <FaTimes size={14} />
                </button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                    {hasRealSummary ? <FaCheckCircle className="text-good shrink-0" size={16} /> : <FaRegCircle className="text-richblack-400 shrink-0" size={16} />}
                    <Link to="/Dashboard/New-Summary" className={`text-sm ${hasRealSummary ? 'text-richblack-400 line-through' : 'text-richblack-5 hover:text-yellow-50'} transition-colors`}>
                        Create your first real summary
                    </Link>
                </div>
                <div className="flex items-center gap-2.5">
                    <FaComments className="text-richblack-500 shrink-0" size={14} />
                    <Link to="/Dashboard/Chats" className="text-richblack-300 hover:text-yellow-50 text-sm transition-colors">
                        Try asking questions about a note in Chat
                    </Link>
                </div>
                <div className="flex items-center gap-2.5">
                    <FaLayerGroup className="text-richblack-500 shrink-0" size={14} />
                    <Link to="/Dashboard/Review" className="text-richblack-300 hover:text-yellow-50 text-sm transition-colors">
                        Generate flashcards or a quiz from a note
                    </Link>
                </div>
            </div>
        </motion.div>
    )
}

export default OnboardingChecklist
