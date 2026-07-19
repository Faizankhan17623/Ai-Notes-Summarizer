import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaBan, FaLock } from 'react-icons/fa'
import { AppealBan } from '../../Services/operations/Auth.js'
import Button from '../extra/Button.jsx'

// Fills the dashboard's main content area for a banned user sir — the sidebar around this
// stays visible but locked (see DashboardLayout.jsx), this panel is the only thing a banned
// user can actually interact with: one appeal form, submittable exactly once.
const BannedNotice = ({ user }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { loading } = useSelector((state) => state.auth)
    const [message, setMessage] = useState('')
    const [justSubmitted, setJustSubmitted] = useState(false)

    const appealStatus = user?.appealStatus || 'none'
    const showForm = appealStatus === 'none' && !justSubmitted

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!message.trim()) return
        const ok = await dispatch(AppealBan(message.trim(), token))
        if (ok) setJustSubmitted(true)
    }

    return (
        <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-16">
            <div className="max-w-lg w-full border border-danger-soft/40 bg-danger-soft/5 rounded-lg p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-danger-soft/10 flex items-center justify-center mx-auto mb-5">
                    <FaBan className="text-danger-soft" size={22} />
                </div>

                <h1 className="font-display text-2xl font-semibold text-richblack-5 mb-2">
                    Your account has been suspended
                </h1>
                {user?.banReason && (
                    <p className="text-richblack-200 text-sm mb-1">
                        Reason: <span className="text-richblack-5">{user.banReason}</span>
                    </p>
                )}
                <p className="text-richblack-400 text-sm mb-6">
                    Every feature is locked while your account is suspended.
                </p>

                {showForm && (
                    <form onSubmit={handleSubmit} className="text-left">
                        <label className="text-sm text-richblack-100 block mb-2">
                            Appeal this decision — you can only submit this once
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            placeholder="Explain why you believe this suspension should be reversed..."
                            className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors resize-none placeholder:text-richblack-500 mb-3"
                        />
                        <Button type="submit" disabled={loading || !message.trim()} className="w-full">
                            {loading ? "Submitting..." : "Submit appeal"}
                        </Button>
                    </form>
                )}

                {(appealStatus === 'pending' || justSubmitted) && (
                    <div className="flex items-center justify-center gap-2 text-sm text-richblack-200 bg-surface-hover border border-border-soft rounded-md px-4 py-3">
                        <FaLock size={12} className="text-richblack-400 shrink-0" />
                        Your appeal has been submitted and is awaiting review.
                    </div>
                )}

                {appealStatus === 'denied' && !justSubmitted && (
                    <div className="text-sm text-richblack-200 bg-surface-hover border border-border-soft rounded-md px-4 py-3">
                        <p className="font-semibold text-richblack-5 mb-1">This account is permanently banned</p>
                        <p>Your appeal was reviewed and denied. This decision is final — no further appeals can be submitted.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BannedNotice
