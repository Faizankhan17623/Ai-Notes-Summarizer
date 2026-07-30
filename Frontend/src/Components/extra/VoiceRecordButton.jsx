import { FaMicrophone, FaStop } from 'react-icons/fa'
import useVoiceRecorder from '../../Hooks/useVoiceRecorder.js'

// tap-to-record button for voice-mode Q&A sir — distinct from MicButton (live dictation into
// the text box); this records a single take and auto-sends it as soon as recording stops,
// no editing step, since that's the point of voice mode vs. plain dictation
const VoiceRecordButton = ({ onRecorded, disabled }) => {
    const { supported, recording, start, stop } = useVoiceRecorder()

    const handleClick = () => {
        if (disabled) return
        if (recording) {
            stop()
        } else {
            start((blob) => {
                if (blob) onRecorded(blob)
            })
        }
    }

    if (!supported) {
        return (
            <span className="text-xs text-richblack-400" title="Voice mode needs microphone access">
                Voice mode not supported in this browser
            </span>
        )
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            title={recording ? "Stop and send" : "Record a question"}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-all
                ${recording
                    ? "bg-pink-200 text-richblack-900 animate-pulse"
                    : "bg-richblack-700 text-richblack-25 hover:bg-richblack-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            {recording ? <FaStop /> : <FaMicrophone />}
            {recording ? "Recording..." : "Ask"}
        </button>
    )
}

export default VoiceRecordButton
