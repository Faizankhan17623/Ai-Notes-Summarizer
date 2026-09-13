import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { addLiveNotification } from '../Slices/notificationSlice.js'
import { NotificationData } from '../Services/Apis/NotificationApi.js'

// live push over SSE sir — EventSource can't set an Authorization header, and the access
// token no longer exists as a real readable value on the frontend (see authSlice.js/
// RestoreSession — it lives only in the httpOnly cookie), so the query-param token fallback
// no longer works either. withCredentials: true makes EventSource send the httpOnly cookie
// instead, same as axios's withCredentials does for every other request (Backend/Middlewares/
// Auth.js checks req.cookies?.token first, before the query-param fallback). Native EventSource
// auto-reconnects on its own after a drop (Render free-tier restart, network blip, etc) with no
// reconnect logic needed here — NotificationBell's poll interval is left running underneath as
// a fallback regardless.
export const useNotificationStream = (isLoggedIn) => {
    const dispatch = useDispatch()

    useEffect(() => {
        if (!isLoggedIn) return undefined

        const source = new EventSource(NotificationData.stream, { withCredentials: true })

        source.addEventListener('notification', (e) => {
            try {
                const payload = JSON.parse(e.data)
                dispatch(addLiveNotification(payload))
            } catch {
                // malformed frame sir — ignore, the next poll will reconcile state anyway
            }
        })

        // no onerror handling beyond letting EventSource's built-in auto-retry run sir —
        // logging every drop would be noisy since Render's free tier idles/restarts often
        return () => source.close()
    }, [isLoggedIn, dispatch])
}
