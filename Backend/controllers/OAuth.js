const crypto = require('crypto')
const cookie = require('cookie')

const User = require('../Models/User')
const Note = require('../Models/Note.js')
const { PROVIDERS, isProviderConfigured } = require('../utils/OAuthProviders.js')
const { signAccessToken, issueSessionCookies, isProd, cookieSameSite } = require('../utils/RefreshToken.js')
const { sampleNoteFields } = require('../utils/SampleNote.js')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

// GET /oauth/providers sir — public, no auth. The frontend only renders a "Continue with X"
// button for a provider that actually has both env vars set, same graceful-degradation idea
// as Razorpay's isConfigured stub-mode flag for payments (Backend/utils/Razorpay.js)
exports.getConfiguredProviders = (req, res) => {
    const providers = Object.keys(PROVIDERS).filter(isProviderConfigured)
    return res.status(200).json({ success: true, providers })
}

// GET /oauth/:provider/start sir — redirects the browser to the provider's consent screen.
// state is a random value stored in its own short-lived httpOnly cookie, compared back on
// callback below — this is CSRF protection for the OAuth flow itself (an attacker can't forge
// a callback request without also controlling the state cookie, which they can't set on the
// victim's browser cross-origin)
exports.startOAuth = (req, res) => {
    const { provider } = req.params
    const cfg = PROVIDERS[provider]

    if (!cfg || !isProviderConfigured(provider)) {
        return res.status(400).json({ success: false, message: 'This sign-in method is not available' })
    }

    const state = crypto.randomBytes(24).toString('hex')
    const stateCookie = cookie.serialize(`oauth_state_${provider}`, state, {
        httpOnly: true,
        secure: isProd,
        sameSite: cookieSameSite,
        maxAge: 10 * 60, // 10 minutes sir — plenty for a consent screen, short enough to limit replay risk
        path: '/',
    })
    res.setHeader('Set-Cookie', stateCookie)

    const params = new URLSearchParams({
        client_id: process.env[cfg.clientIdEnv],
        redirect_uri: `${BACKEND_URL}/api/v1/oauth/${provider}/callback`,
        response_type: 'code',
        scope: cfg.scope,
        state,
    })

    return res.redirect(`${cfg.authUrl}?${params.toString()}`)
}

// the browser is mid-redirect from the provider here sir, not an XHR caller — every failure
// path below sends it back to the Login page with a query-string reason, never a JSON 4xx/5xx
const redirectToLoginError = (res, reason) =>
    res.redirect(`${FRONTEND_URL}/Login?oauthError=${encodeURIComponent(reason)}`)

// GitHub's /user response can have email:null (private email setting) sir — this is the
// documented fallback, GET /user/emails and pick the primary+verified one
const fetchGithubEmail = async (accessToken) => {
    const response = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Notewise' },
    })
    if (!response.ok) return null
    const emails = await response.json()
    const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified)
    return primary?.email || null
}

// GET /oauth/:provider/callback sir
exports.oauthCallback = async (req, res) => {
    const { provider } = req.params
    const cfg = PROVIDERS[provider]

    try {
        if (!cfg || !isProviderConfigured(provider)) {
            return redirectToLoginError(res, 'This sign-in method is not available')
        }

        const { code, state, error: providerError } = req.query

        if (providerError) {
            return redirectToLoginError(res, 'Sign-in was cancelled')
        }

        const expectedState = req.cookies?.[`oauth_state_${provider}`]
        if (!code || !state || !expectedState || state !== expectedState) {
            return redirectToLoginError(res, 'Sign-in session expired, please try again')
        }
        // one-shot sir — clear the state cookie now that it's been checked, same principle as
        // a nonce (never valid to reuse, even on a legitimate retry)
        res.setHeader('Set-Cookie', cookie.serialize(`oauth_state_${provider}`, '', { maxAge: 0, path: '/' }))

        // exchange the code for an access token sir — every provider here accepts this same
        // form-encoded body shape, differences are isolated to OAuthProviders.js's URLs/scopes
        const tokenResponse = await fetch(cfg.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: new URLSearchParams({
                client_id: process.env[cfg.clientIdEnv],
                client_secret: process.env[cfg.clientSecretEnv],
                code,
                redirect_uri: `${BACKEND_URL}/api/v1/oauth/${provider}/callback`,
                grant_type: 'authorization_code',
            }),
            signal: AbortSignal.timeout(10000),
        })
        const tokenData = await tokenResponse.json().catch(() => null)
        if (!tokenResponse.ok || !tokenData?.access_token) {
            console.log(`OAuth token exchange failed for ${provider}:`, tokenData)
            return redirectToLoginError(res, 'Could not complete sign-in, please try again')
        }

        const userInfoResponse = await fetch(cfg.userInfoUrl, {
            headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Notewise' },
            signal: AbortSignal.timeout(10000),
        })
        const rawProfile = await userInfoResponse.json().catch(() => null)
        if (!userInfoResponse.ok || !rawProfile) {
            return redirectToLoginError(res, 'Could not fetch your profile, please try again')
        }

        const profile = cfg.mapProfile(rawProfile)

        // GitHub only sir — every other provider's userinfo call already includes email
        if (provider === 'github' && !profile.email) {
            profile.email = await fetchGithubEmail(tokenData.access_token)
        }

        if (!profile.email) {
            return redirectToLoginError(res, 'Could not get your email from this provider, please try a different sign-in method')
        }

        // matches either an already-linked provider account, or an existing password account
        // with the same email sir (auto-link: same verified email = same person)
        let user = await User.findOne({
            $or: [
                { 'oauthProviders.provider': provider, 'oauthProviders.providerId': profile.providerId },
                { email: profile.email.toLowerCase() },
            ],
        })

        let isNewUser = false

        if (!user) {
            isNewUser = true
            user = await User.create({
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email.toLowerCase(),
                // no password field sir — optional on the schema now, see Models/User.js
                Verified: true, // the provider already confirmed this email, no OTP round-trip needed
                oauthProviders: [{ provider, providerId: profile.providerId }],
            })
        } else if (!user.oauthProviders.some((p) => p.provider === provider)) {
            // existing account (password-based, or already linked to a different provider)
            // signing in with a NEW provider for the first time sir — auto-link, touch nothing else
            user.oauthProviders.push({ provider, providerId: profile.providerId })
            await user.save()
        }

        if (isNewUser) {
            Note.create({ user: user._id, ...sampleNoteFields() }).catch((err) =>
                console.log('Sample note creation failed:', err.message)
            )
        }

        // same session-issuing helper loginUser uses sir — a social login and a password
        // login end up with an identical session (same cookies, same refresh-token rotation)
        await issueSessionCookies(res, user)

        return res.redirect(`${FRONTEND_URL}/oauth/callback`)
    } catch (error) {
        console.log(`OAuth callback error for ${provider}:`, error.message)
        return redirectToLoginError(res, 'Something went wrong during sign-in')
    }
}

// GET /oauth/session sir — Auth-gated (reads the token cookie oauthCallback just set). The
// browser's redirect above can't deliver a JSON body, so the frontend's /oauth/callback page
// calls this once to get the exact {token, user} shape loginUser's response already has,
// re-signing a fresh access token for whoever the cookie already proves they are.
exports.getOAuthSession = async (req, res) => {
    try {
        const user = await User.findById(req.User.id).select('firstName lastName email role SubType isBanned banReason appealStatus')
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found, please log in again' })
        }

        const accessToken = signAccessToken(user)

        return res.status(200).json({
            success: true,
            token: accessToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                SubType: user.SubType,
                isBanned: user.isBanned,
                banReason: user.banReason,
                appealStatus: user.appealStatus,
            },
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: 'Failed to complete sign-in' })
    }
}
