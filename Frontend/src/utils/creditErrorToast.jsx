import toast from "react-hot-toast"

// drop-in replacement for toast.error(error?.response?.data?.message || fallback) sir —
// the backend already sends a friendly, specific message on credit exhaustion
// (Backend/utils/Plans.js consumeCredit/consumeFeatureUsage, surfaced as a 403), this just
// makes that moment harder to miss/dismiss than a normal transient toast, with a way out
export const showAiErrorToast = (error, fallback) => {
    const message = error?.response?.data?.message || fallback
    const isCreditLimit = error?.response?.status === 403 && /credit/i.test(message || "")

    if (isCreditLimit) {
        toast.error(
            (t) => (
                <span className="flex items-center gap-3">
                    <span>{message}</span>
                    <a
                        href="/Pricing"
                        onClick={() => toast.dismiss(t.id)}
                        className="underline font-semibold shrink-0"
                    >
                        Upgrade
                    </a>
                </span>
            ),
            { duration: 8000 }
        )
        return
    }

    toast.error(message)
}
