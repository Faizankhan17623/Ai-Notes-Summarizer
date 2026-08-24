import { useSelector } from 'react-redux'

// full-screen loader sir — covers every NewSummary path that sets notes.loading (text, document,
// bulk upload, import, audio all dispatch setLoading via Services/operations/Notes.js), so one
// overlay here is enough instead of a spinner per tab. Same dimmed-backdrop treatment as
// PaymentVerifyOverlay — without the dim layer the spinner+text had nothing to visually separate
// them from the page underneath and just looked like it was floating mid-textarea.
const SummarizeLoaderOverlay = () => {
    const { loading, loadingLabel } = useSelector((state) => state.notes)

    if (!loading) return null

    return (
        <div className="fixed inset-0 bg-richblack-900/70 backdrop-blur-[2px] z-[10000] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin" />
            <p className="text-richblack-5 font-semibold text-lg">
                {loadingLabel}
            </p>
        </div>
    )
}

export default SummarizeLoaderOverlay
