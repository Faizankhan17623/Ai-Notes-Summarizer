import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { addLiveNotification } from '../Slices/notificationSlice.js'
import { NotificationData } from '../Services/Apis/NotificationApi.js'

// live push over SSE sir — EventSource can't set an Authorization header, so the token
// travels as a query param instead (Backend/Middlewares/Auth.js accepts that as a fallback,
// used ONLY by this route). Native EventSource auto-reconnects on its own after a drop
// (Render free-tier restart, network blip, etc) with no reconnect logic needed here —
// NotificationBell's poll interval is left running underneath as a fallback regardless.
export const useNotificationStream = (token) => {
    const dispatch = useDispatch()

    useEffect(() => {
        if (!token) return undefined

        const url = `${NotificationData.stream}?token=${encodeURIComponent(token)}`
        const source = new EventSource(url)

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
    }, [token, dispatch])
}
