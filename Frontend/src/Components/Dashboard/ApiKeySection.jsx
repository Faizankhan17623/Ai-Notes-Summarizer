import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GetApiKeyStatus, GenerateApiKey, RevokeApiKey } from '../../Services/operations/ApiKey.js'
import IconBtn from '../extra/IconBtn.jsx'

// Pro/ProMax-only perk sir — programmatic access to POST /external/summarize via x-api-key
const ApiKeySection = ({ isPaidPlan }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { hasKey, createdAt, lastUsedAt, freshKey } = useSelector((state) => state.apiKey)

    useEffect(() => {
        if (isPaidPlan) dispatch(GetApiKeyStatus(token))
    }, [dispatch, token, isPaidPlan])

    if (!isPaidPlan) {
        return (
            <div className="border border-border-soft bg-surface rounded-lg p-6">
                <h2 className="text-richblack-5 font-semibold mb-2">API access</h2>
                <p className="text-richblack-400 text-sm">
                    Programmatic access to the summarize endpoint is a Pro / Pro Max perk.{' '}
                    <Link to="/Pricing" className="text-yellow-50">Upgrade to unlock it</Link>.
                </p>
            </div>
        )
    }

    const copyKey = () => {
        navigator.clipboard.writeText(freshKey)
        toast.success('Copied')
    }

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-6 space-y-3">
            <h2 className="text-richblack-5 font-semibold">API access</h2>
            <p className="text-richblack-400 text-sm">
                Call <code className="bg-richblack-800 px-1.5 py-0.5 rounded text-xs">POST /external/summarize</code> with an{' '}
                <code className="bg-richblack-800 px-1.5 py-0.5 rounded text-xs">x-api-key</code> header. This key only works on that one endpoint.
            </p>

            {freshKey && (
                <div className="bg-richblack-800 border border-yellow-50 rounded-md p-3 flex items-center justify-between gap-3">
                    <code className="text-yellow-50 text-xs break-all">{freshKey}</code>
                    <button onClick={copyKey} className="text-xs text-richblack-200 shrink-0 cursor-pointer">Copy</button>
                </div>
            )}
            {freshKey && <p className="text-pink-200 text-xs">Copy it now — it will not be shown again.</p>}

            {hasKey && !freshKey && (
                <p className="text-richblack-300 text-sm">
                    Active key created {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
                    {lastUsedAt ? `, last used ${new Date(lastUsedAt).toLocaleString()}` : ', never used yet'}.
                </p>
            )}
            {!hasKey && !freshKey && <p className="text-richblack-400 text-sm">No API key yet.</p>}

            <div className="flex gap-3">
                <IconBtn text={hasKey ? "Regenerate key" : "Generate key"} outline onclick={() => dispatch(GenerateApiKey(token))} />
                {hasKey && <IconBtn text="Revoke" outline onclick={() => dispatch(RevokeApiKey(token))} />}
            </div>
        </div>
    )
}

export default ApiKeySection
