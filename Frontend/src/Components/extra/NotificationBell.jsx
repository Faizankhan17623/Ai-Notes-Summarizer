import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaBell } from 'react-icons/fa'
import { GetNotifications, MarkNotificationRead, MarkAllNotificationsRead } from '../../Services/operations/Notification.js'

const POLL_INTERVAL_MS = 30000

// bell + dropdown, polled sir — not pushed. See Backend/Models/Notification.js for why: this
// runs on Render's free tier, which sleeps/restarts, so a persistent socket/SSE connection
// would fight the platform for a use case that never needed sub-second delivery anyway
const NotificationBell = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token } = useSelector((state) => state.auth)
    const { notifications, unreadCount } = useSelector((state) => state.notification)
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    useEffect(() => {
        dispatch(GetNotifications(token))
        const interval = setInterval(() => dispatch(GetNotifications(token)), POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [dispatch, token])

    useEffect(() => {
        const onClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const handleClick = (n) => {
        if (!n.read) dispatch(MarkNotificationRead(n._id, token))
        if (n.link) {
            navigate(n.link)
            setOpen(false)
        }
    }

    return (
        <div className="relative" ref={rootRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                title="Notifications"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                className="relative text-richblack-100 hover:text-richblack-25 cursor-pointer w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors duration-150"
            >
                <FaBell size={15} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-danger-soft text-richblack-900 text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface-raised border border-border-soft rounded-lg shadow-lg z-50">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft">
                        <p className="text-richblack-5 text-sm font-semibold">Notifications</p>
                        {unreadCount > 0 && (
                            <button onClick={() => dispatch(MarkAllNotificationsRead(token))} className="text-yellow-50 text-xs cursor-pointer hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <p className="text-richblack-400 text-sm px-4 py-6 text-center">No notifications yet.</p>
                    ) : (
                        <ul>
                            {notifications.map((n) => (
                                <li key={n._id}>
                                    <button
                                        onClick={() => handleClick(n)}
                                        className={`w-full text-left px-4 py-3 border-b border-border-soft last:border-b-0 hover:bg-surface-hover transition-colors cursor-pointer ${!n.read ? 'bg-yellow-50/5' : ''}`}
                                    >
                                        <p className={`text-sm ${!n.read ? 'text-richblack-5 font-medium' : 'text-richblack-300'}`}>{n.message}</p>
                                        <p className="text-richblack-500 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}

export default NotificationBell
