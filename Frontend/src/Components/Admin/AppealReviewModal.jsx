import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { AnimatePresence, motion } from 'motion/react'
import { FaTimes } from 'react-icons/fa'
import { UnbanUser, DenyAppeal } from '../../Services/operations/Admin.js'

// opens instead of the old inline Unban/Deny appeal text links sir, while an appeal is
// 'pending' — shows the actual appeal message (previously just a tooltip on the "Appeal
// pending" badge, easy to miss) alongside all 4 relevant actions in one place: Unban (lifts
// it), Deny appeal (see Backend/controllers/Admin.js denyAppeal for what happens next — strike
// 1 reopens one more appeal window, strike 2 is terminal), and Ban/Delete for finishing the
// account off directly without even waiting for the appeal outcome, if the admin already knows
// their decision.
const AppealReviewModal = ({ user, token, onClose, onBan, onDelete }) => {
    const dispatch = useDispatch()
    const [busy, setBusy] = useState(false)

    if (!user) return null

    const runThenClose = async (thunk) => {
        setBusy(true)
        await dispatch(thunk)
        setBusy(false)
        onClose()
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-richblack-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center px-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative bg-surface-raised border border-border-soft rounded-lg p-6 max-w-md w-full"
                >
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-4 right-4 text-richblack-400 hover:text-richblack-5 cursor-pointer"
                    >
                        <FaTimes size={14} />
                    </button>

                    <h2 className="text-richblack-5 font-semibold text-lg mb-1">Review appeal</h2>
                    <p className="text-richblack-400 text-sm mb-4">{user.firstName} {user.lastName} · {user.email}</p>

                    <div className="space-y-3 mb-6">
                        {user.banReason && (
                            <div>
                                <p className="text-richblack-400 text-xs uppercase tracking-wide mb-1">
                                    {user.banType === 'suspend' ? 'Suspension reason' : 'Ban reason'}
                                </p>
                                <p className="text-richblack-100 text-sm bg-surface-hover border border-border-soft rounded-md px-3 py-2">{user.banReason}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-richblack-400 text-xs uppercase tracking-wide mb-1">User's appeal</p>
                            <p className="text-richblack-100 text-sm bg-surface-hover border border-border-soft rounded-md px-3 py-2 whitespace-pre-wrap">
                                {user.appealMessage || '(no message)'}
                            </p>
                            {user.appealSubmittedAt && (
                                <p className="text-richblack-500 text-xs mt-1">Submitted {new Date(user.appealSubmittedAt).toLocaleString()}</p>
                            )}
                        </div>
                        {user.banType === 'suspend' && (
                            <p className="text-richblack-400 text-xs">Strike {user.suspensionCount}/2</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            disabled={busy}
                            onClick={() => runThenClose(UnbanUser(user._id, token))}
                            className="text-sm font-medium rounded-md px-3 py-2 bg-good/10 text-good hover:bg-good/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Unban
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => runThenClose(DenyAppeal(user._id, token))}
                            className="text-sm font-medium rounded-md px-3 py-2 bg-warn/10 text-warn hover:bg-warn/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Deny appeal
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => { onClose(); onBan(user._id) }}
                            className="text-sm font-medium rounded-md px-3 py-2 bg-danger-soft/10 text-danger-soft hover:bg-danger-soft/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Ban directly
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => { onClose(); onDelete(user._id, `${user.firstName} ${user.lastName}`) }}
                            className="text-sm font-medium rounded-md px-3 py-2 bg-danger-soft/10 text-danger-soft hover:bg-danger-soft/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Delete account
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default AppealReviewModal
