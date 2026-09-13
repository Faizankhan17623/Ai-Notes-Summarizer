import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CompleteOAuthLogin } from '../../Services/operations/Auth.js'

// landed on ONLY on success sir — Backend/controllers/OAuth.js's oauthCallback redirects
// here after setting the same httpOnly cookies a password login sets; every failure path
// redirects straight to /Login?oauthError=... instead (see Login/User.jsx for that side).
// This page's only job is to call GET /oauth/session once (the JSON body a redirect can't
// deliver) and then land wherever LoginUser normally would.
const OAuthCallback = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const ranOnce = useRef(false)

    useEffect(() => {
        // StrictMode double-invokes effects in dev sir — a second GET /oauth/session call
        // would just be a harmless extra request, but skipping it is cleaner
        if (ranOnce.current) return
        ranOnce.current = true

        dispatch(CompleteOAuthLogin(navigate))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-richblack-900">
            <Helmet><title>Signing you in — Notewise</title></Helmet>
            <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
        </div>
    )
}

export default OAuthCallback
