import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GetActiveAnnouncement } from '../../Services/operations/Admin.js'

// up to 3 can be active at once now sir (see MAX_ACTIVE_ANNOUNCEMENTS in Backend/controllers/
// Admin.js) — stacked one per row instead of the old single-banner assumption. Each dismisses
// independently, tracked by id rather than one shared boolean
const AnnouncementBanner = () => {
    const dispatch = useDispatch()
    const { announcements } = useSelector((state) => state.admin)
    const [dismissedIds, setDismissedIds] = useState([])

    useEffect(() => {
        dispatch(GetActiveAnnouncement())
    }, [dispatch])

    const visible = (announcements || []).filter((a) => a.active && !dismissedIds.includes(a._id))

    if (visible.length === 0) return null

    return (
        <div>
            {visible.map((announcement) => (
                <div key={announcement._id} className="w-full bg-yellow-50 text-richblack-900 text-sm font-medium py-2 px-4 flex items-center justify-center gap-4">
                    <span>{announcement.message}</span>
                    <button
                        onClick={() => setDismissedIds((ids) => [...ids, announcement._id])}
                        title="Dismiss announcement"
                        aria-label="Dismiss announcement"
                        className="font-bold cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    )
}

export default AnnouncementBanner
