import { useEffect, useState } from 'react'
import { FaGoogle, FaFacebook, FaGithub, FaLinkedin } from 'react-icons/fa'
import { GetOAuthProviders } from '../../Services/operations/Auth.js'
import { OAuthData } from '../../Services/Apis/OAuthApi.js'

// one entry per provider Backend/utils/OAuthProviders.js supports sir — icon + label only,
// the actual config (client id, scope, endpoints) lives entirely on the backend
const PROVIDER_META = {
    google: { label: 'Google', icon: FaGoogle },
    facebook: { label: 'Facebook', icon: FaFacebook },
    github: { label: 'GitHub', icon: FaGithub },
    linkedin: { label: 'LinkedIn', icon: FaLinkedin },
}

// shown on both Login (User.jsx) and Signup (Join.jsx) sir — OAuth doesn't distinguish
// "sign in" from "sign up", a first-time provider login just creates the account (see
// Backend/controllers/OAuth.js oauthCallback), so the same button row works on both pages
const OAuthButtons = () => {
    const [providers, setProviders] = useState([])

    useEffect(() => {
        GetOAuthProviders().then(setProviders)
    }, [])

    if (providers.length === 0) return null

    return (
        <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border-soft" />
                <span className="text-richblack-400 text-xs">or continue with</span>
                <div className="flex-1 h-px bg-border-soft" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                {providers.map((provider) => {
                    const meta = PROVIDER_META[provider]
                    if (!meta) return null
                    const Icon = meta.icon
                    return (
                        // real <a> navigation sir, not a button+fetch — OAuth's redirect dance
                        // requires a top-level browser navigation, XHR/CORS can't do this
                        <a
                            key={provider}
                            href={OAuthData.startUrl(provider)}
                            className="flex items-center justify-center gap-2 border border-border-soft rounded-md px-4 py-2.5 text-sm text-richblack-100 hover:border-yellow-50 hover:bg-surface-hover transition-colors"
                        >
                            <Icon size={14} /> {meta.label}
                        </a>
                    )
                })}
            </div>
        </div>
    )
}

export default OAuthButtons
