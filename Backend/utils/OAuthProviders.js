// one config object per provider sir — authUrl/tokenUrl/userInfoUrl/scope plus a mapProfile()
// that normalizes each provider's differently-shaped response into {providerId, email,
// firstName, lastName}. controllers/OAuth.js stays generic and only ever talks to THIS file's
// shape, never a provider's raw response directly, so adding a 5th provider later never
// touches the controller.

const splitName = (fullName) => {
    const parts = (fullName || '').trim().split(/\s+/)
    return {
        firstName: parts[0] || 'User',
        lastName: parts.slice(1).join(' ') || '',
    }
}

const PROVIDERS = {
    google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scope: 'openid email profile',
        clientIdEnv: 'GOOGLE_CLIENT_ID',
        clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
        // Google's OIDC userinfo already returns given_name/family_name split sir, no
        // splitName needed here unlike the other three
        mapProfile: (raw) => ({
            providerId: raw.sub,
            email: raw.email,
            firstName: raw.given_name || 'User',
            lastName: raw.family_name || '',
        }),
    },
    github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        // a GitHub account's email can be private sir — user:email is what lets
        // controllers/OAuth.js fall back to GET /user/emails when userInfo.email comes back null
        scope: 'read:user user:email',
        clientIdEnv: 'GITHUB_CLIENT_ID',
        clientSecretEnv: 'GITHUB_CLIENT_SECRET',
        // GitHub's /user has no split first/last name sir, just one optional display "name"
        // (can be null if the user never set one) — split it, and email is handled by the
        // controller's /user/emails fallback, not here (mapProfile only sees the /user response)
        mapProfile: (raw) => ({
            providerId: String(raw.id),
            email: raw.email || null,
            ...splitName(raw.name || raw.login),
        }),
    },
}

const isProviderConfigured = (provider) => {
    const cfg = PROVIDERS[provider]
    return !!(cfg && process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv])
}

module.exports = { PROVIDERS, isProviderConfigured }
