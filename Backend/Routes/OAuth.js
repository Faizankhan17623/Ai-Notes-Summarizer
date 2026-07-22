const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { authLimiter } = require('../Middlewares/RateLimit.js')
const { getConfiguredProviders, startOAuth, oauthCallback, getOAuthSession } = require('../controllers/OAuth.js')

// only ever one of these four sir — the controller looks the value up in a fixed config
// object (Backend/utils/OAuthProviders.js), never interpolates it into a URL/require path,
// but a param-level check here means a bad provider name never even reaches that logic
const validProvider = (req, res, next) => {
    if (!['google', 'facebook', 'github', 'linkedin'].includes(req.params.provider)) {
        return res.status(400).json({ success: false, message: 'Unknown sign-in provider' })
    }
    next()
}

// public, no auth sir — lets the Login/Signup pages know which "Continue with X" buttons to show
route.get('/oauth/providers', getConfiguredProviders)

// no CSRF on these two sir — /start is the auth entry point itself (nothing to protect yet,
// same reasoning as /Login), /callback is a top-level browser redirect FROM the provider,
// which can't carry a same-site CSRF token the normal way. authLimiter (IP-based) covers both.
route.get('/oauth/:provider/start', authLimiter, validProvider, startOAuth)
route.get('/oauth/:provider/callback', authLimiter, validProvider, oauthCallback)

// Auth-gated sir — reads the token cookie oauthCallback already set
route.get('/oauth/session', Auth, getOAuthSession)

module.exports = route
