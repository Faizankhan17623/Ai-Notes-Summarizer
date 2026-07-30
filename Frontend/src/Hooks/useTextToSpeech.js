import { useCallback, useRef, useState } from "react"

// wraps the browser's native speechSynthesis sir — free, no backend cost, no extra API key.
// Used to read voice-mode chat replies aloud (server-side Groq TTS needs a paid account, so
// this is the client-side alternative). Supported in effectively every modern browser.
const supported = typeof window !== "undefined" && "speechSynthesis" in window

// returns { supported, speaking, speak, stop }
export default function useTextToSpeech() {
    const [speaking, setSpeaking] = useState(false)
    const utteranceRef = useRef(null)

    const stop = useCallback(() => {
        if (!supported) return
        window.speechSynthesis.cancel()
        setSpeaking(false)
    }, [])

    const speak = useCallback((text) => {
        if (!supported || !text?.trim()) return
        stop()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onstart = () => setSpeaking(true)
        utterance.onend = () => setSpeaking(false)
        utterance.onerror = () => setSpeaking(false)
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
    }, [stop])

    return { supported, speaking, speak, stop }
}
