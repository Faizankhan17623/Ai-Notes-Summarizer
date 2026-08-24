import { useSelector } from 'react-redux'

// full-screen loader sir — covers every NewSummary path that sets notes.loading (text, document,
// bulk upload, import, audio all dispatch setLoading via Services/operations/Notes.js), so one
// overlay here is enough instead of a spinner per tab. Background is left fully transparent
// (no dim/blur) per spec — only the spinner + label render, page stays visible underneath.
const SummarizeLoaderOverlay = () => {
    const { loading, loadingLabel } = useSelector((state) => state.notes)

    if (!loading) return null

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="w-12 h-12 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin" />
            <p className="text-richblack-5 font-semibold text-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {loadingLabel}
            </p>
        </div>
    )
}

export default SummarizeLoaderOverlay
