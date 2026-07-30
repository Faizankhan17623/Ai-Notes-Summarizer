import { useCallback, useRef, useState } from "react"

// plays back base64-encoded audio returned from the backend's `audio` SSE event sir —
// used for voice-mode Q&A's spoken replies (server-side Groq TTS, not browser speechSynthesis)
export default function useAudioPlayback() {
    const [playing, setPlaying] = useState(false)
    const audioRef = useRef(null)

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
        setPlaying(false)
    }, [])

    const play = useCallback((base64, mimeType = "audio/wav") => {
        stop()
        const audio = new Audio(`data:${mimeType};base64,${base64}`)
        audioRef.current = audio
        audio.onended = () => setPlaying(false)
        audio.onerror = () => setPlaying(false)
        setPlaying(true)
        audio.play().catch(() => setPlaying(false))
    }, [stop])

    return { playing, play, stop }
}
