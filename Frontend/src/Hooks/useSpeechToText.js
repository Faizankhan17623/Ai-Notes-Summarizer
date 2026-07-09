import { useEffect, useRef, useState, useCallback } from "react"

// wraps the browser's native Web Speech API sir — free, no backend cost, no extra API key
// Chrome/Edge support it as webkitSpeechRecognition, Firefox does not support it at all yet
const SpeechRecognitionImpl = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

// returns { supported, listening, transcript, start, stop, reset }
// `transcript` accumulates final results across the whole recording session sir
export default function useSpeechToText({ lang = "en-US" } = {}) {
    const supported = Boolean(SpeechRecognitionImpl)
    const [listening, setListening] = useState(false)
    const [transcript, setTranscript] = useState("")
    const recognitionRef = useRef(null)

    useEffect(() => {
        if (!supported) return

        const recognition = new SpeechRecognitionImpl()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = lang

        recognition.onresult = (event) => {
            let finalChunk = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalChunk += event.results[i][0].transcript
                }
            }
            if (finalChunk) {
                setTranscript((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk).trim())
            }
        }

        recognition.onerror = () => {
            setListening(false)
        }

        recognition.onend = () => {
            setListening(false)
        }

        recognitionRef.current = recognition

        return () => {
            recognition.stop()
        }
    }, [supported, lang])

    const start = useCallback(() => {
        if (!recognitionRef.current || listening) return
        try {
            recognitionRef.current.start()
            setListening(true)
        } catch {
            // start() throws if called while already running sir — safe to ignore
        }
    }, [listening])

    const stop = useCallback(() => {
        if (!recognitionRef.current) return
        recognitionRef.current.stop()
        setListening(false)
    }, [])

    const reset = useCallback(() => setTranscript(""), [])

    return { supported, listening, transcript, start, stop, reset }
}
