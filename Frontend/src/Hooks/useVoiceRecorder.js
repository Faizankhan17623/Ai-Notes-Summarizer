import { useCallback, useRef, useState } from "react"

// wraps MediaRecorder sir — records a single take and resolves it as a Blob, for the
// Whisper-backed voice-mode path (distinct from useSpeechToText, which is live browser
// dictation into the text box). Works in any browser with getUserMedia, including Firefox
// and mobile Safari, unlike the Chrome/Edge-only SpeechRecognition API.
const supported = typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)

// returns { supported, recording, start, stop }
// `start(onStop)` begins recording sir — `onStop` is called once with the recorded Blob
// when `stop()` is invoked. Auto-stops after maxDurationMs as a safety cap.
export default function useVoiceRecorder({ maxDurationMs = 60000 } = {}) {
    const [recording, setRecording] = useState(false)
    const recorderRef = useRef(null)
    const chunksRef = useRef([])
    const streamRef = useRef(null)
    const timeoutRef = useRef(null)

    const cleanup = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)
    }, [])

    const start = useCallback(async (onStop) => {
        if (!supported || recording) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            chunksRef.current = []

            const recorder = new MediaRecorder(stream)
            recorderRef.current = recorder

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
            }
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
                cleanup()
                onStop?.(blob)
            }

            recorder.start()
            setRecording(true)
            timeoutRef.current = setTimeout(() => recorder.stop(), maxDurationMs)
        } catch {
            cleanup()
            onStop?.(null)
        }
    }, [recording, maxDurationMs, cleanup])

    const stop = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop()
        }
    }, [])

    return { supported, recording, start, stop }
}
