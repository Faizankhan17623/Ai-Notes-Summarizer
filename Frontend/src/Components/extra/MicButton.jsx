import { useEffect, useRef } from 'react'
import { FaMicrophone, FaStop } from 'react-icons/fa'
import useSpeechToText from '../../Hooks/useSpeechToText.js'

// shared voice-dictation button sir — mounts its own recognition session, and
// hands the growing transcript back up to the parent via onTranscript as it updates
const MicButton = ({ onTranscript }) => {
    const { supported, listening, transcript, start, stop, reset } = useSpeechToText()
    const lastSent = useRef("")

    useEffect(() => {
        if (transcript && transcript !== lastSent.current) {
            lastSent.current = transcript
            onTranscript(transcript)
        }
    }, [transcript, onTranscript])

    const handleClick = () => {
        if (listening) {
            stop()
        } else {
            reset()
            lastSent.current = ""
            start()
        }
    }

    if (!supported) {
        return (
            <span className="text-xs text-richblack-400" title="Voice dictation needs Chrome or Edge">
                Voice input not supported in this browser
            </span>
        )
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            title={listening ? "Stop dictating" : "Dictate with your voice"}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-all
                ${listening
                    ? "bg-pink-200 text-richblack-900 animate-pulse"
                    : "bg-richblack-700 text-richblack-25 hover:bg-richblack-600"
                }`}
        >
            {listening ? <FaStop /> : <FaMicrophone />}
            {listening ? "Listening..." : "Speak"}
        </button>
    )
}

export default MicButton
