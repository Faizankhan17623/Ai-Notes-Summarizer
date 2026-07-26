import { useState } from 'react'
import { motion } from 'motion/react'
import { FaCommentDots } from 'react-icons/fa'
import FeedbackModal from './FeedbackModal.jsx'

// floating launcher for the bug-report/feature-suggestion modal sir — lives once in
// DashboardLayout (see its Outlet wrapper) so it follows the user across every dashboard
// page instead of being re-mounted per-page like the old standalone /ReportBug page was
const QuickActionsButton = () => {
    const [open, setOpen] = useState(false)

    return (
        <>
            <motion.button
                onClick={() => setOpen(true)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                title="Report a bug or suggest a feature"
                aria-label="Report a bug or suggest a feature"
                className="fixed bottom-6 right-6 z-[9000] w-12 h-12 rounded-full bg-yellow-50 text-richblack-900 shadow-lg shadow-black/30 flex items-center justify-center cursor-pointer"
            >
                <FaCommentDots size={18} />
            </motion.button>

            {open && <FeedbackModal onClose={() => setOpen(false)} />}
        </>
    )
}

export default QuickActionsButton
