import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GetActiveAnnouncement } from '../../Services/operations/Admin.js'

const AnnouncementBanner = () => {
    const dispatch = useDispatch()
    const { announcements } = useSelector((state) => state.admin)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        dispatch(GetActiveAnnouncement())
    }, [dispatch])

    const announcement = announcements?.[0]

    if (!announcement || !announcement.active || dismissed) return null

    return (
        <div className="w-full bg-yellow-50 text-richblack-900 text-sm font-medium py-2 px-4 flex items-center justify-center gap-4">
            <span>{announcement.message}</span>
            <button onClick={() => setDismissed(true)} className="font-bold cursor-pointer">✕</button>
        </div>
    )
}

export default AnnouncementBanner
