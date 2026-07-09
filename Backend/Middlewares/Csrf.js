const { doubleCsrf } = require('csrf-csrf')

const isProd = process.env.NODE_ENV === 'production'

// double-submit-cookie CSRF sir — a signed secret cookie plus a matching x-csrf-token header
// on state-changing requests. header-based token transmission so it works identically for
// JSON bodies and the multipart /summarize upload
const { generateCsrfToken, doubleCsrfProtection, invalidCsrfTokenError } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    // no server-side session store here sir — bind the token to the caller's access-token
    // cookie when it exists (post-login), otherwise fall back to a constant so the pre-login
    // /csrf-token fetch (Send-otp, Createuser, Login forms) still works. The real forgery
    // defense is the signed secret cookie itself, this identifier only scopes it further
    getSessionIdentifier: (req) => req.cookies?.token || 'anonymous',
    // __Host- prefix requires Secure + no Domain + path=/ sir, the right lockdown for production;
    // localhost dev over http can't set a __Host- cookie, so it falls back to a plain name there
    cookieName: isProd ? '__Host-csrf' : 'csrf-token',
    cookieOptions: { sameSite: 'lax', secure: isProd, path: '/' },
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
})

module.exports = { generateCsrfToken, doubleCsrfProtection, invalidCsrfTokenError }
