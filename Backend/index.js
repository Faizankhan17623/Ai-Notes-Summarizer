require('dotenv').config({ quiet: true })
require('colors')

const express = require('express')
const app = express()
const cors = require('cors')
const helmet = require('helmet')
const fileUpload = require('express-fileupload')
const cookieParser = require('cookie-parser')

const Port = process.env.PORT || 4000

const connectDB = require('./Installation/mongo')
const auth = require('./Routes/Auth.js')
const notes = require('./Routes/Notes.js')
const chat = require('./Routes/Chat.js')
const studyKit = require('./Routes/StudyKit.js')
const external = require('./Routes/External.js')
const payment = require('./Routes/Payment.js')
const analytics = require('./Routes/Analytics.js')
const admin = require('./Routes/Admin.js')
const contact = require('./Routes/Contact.js')
const { globalLimiter } = require('./Middlewares/RateLimit.js')
const { generateCsrfToken, invalidCsrfTokenError } = require('./Middlewares/Csrf.js')
const { scheduleWeeklyDigest } = require('./utils/DigestJob.js')

// deployed behind a proxy (Render/Railway/nginx) sir — needed so the rate limiter sees the REAL client IP
app.set('trust proxy', 1)

// security headers on every response sir
app.use(helmet())

app.use(express.json())

// credentials:true so the auth cookie flows sir — the frontend must call axios with withCredentials:true
// NOTE: origin:'*' is not usable here — browsers reject Access-Control-Allow-Origin:* together
// with Access-Control-Allow-Credentials:true, so a wildcard would silently break the cookie-based
// login instead of fixing anything. A plain allowlist is the only way to keep credentials working.
//
// The allowlist comes from env sir — CORS_ORIGINS is a comma-separated list, so a fresh
// deployment only needs a Render env var updated, never a code change + redeploy:
//   CORS_ORIGINS=https://my-app.vercel.app,https://www.myapp.com
// FRONTEND_URL is included automatically as a safety net, and localhost is added
// outside production so local dev always works with zero setup.
//
// Known production frontends are baked in below sir — so a fresh Render deploy works
// IMMEDIATELY, before any env vars are configured. If the Vercel URL ever changes,
// either add it here or set CORS_ORIGINS on Render (no redeploy needed for the latter).
const knownProdOrigins = [
    'https://ai-notes-summarizer-phi.vercel.app',
]

const allowedOrigins = [...new Set(
    [
        ...knownProdOrigins,
        ...(process.env.CORS_ORIGINS || '').split(','),
        process.env.FRONTEND_URL,
        ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
    ]
        .map((origin) => origin && origin.trim().replace(/\/+$/, '')) // trailing-slash paste is the #1 CORS-mismatch bug sir
        .filter(Boolean)
)]

app.use(cors({
    origin(origin, callback) {
        // no Origin header = same-origin, curl, health checks, server-to-server sir — always allow
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        // unknown origin: deny WITHOUT throwing sir — callback(new Error) would turn every
        // blocked preflight into a 500 in the logs; this way the browser just blocks it cleanly
        console.log(`CORS blocked origin: ${origin}`)
        return callback(null, false)
    },
    credentials: true,
}))
app.use(cookieParser())
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB sir — covers notes (PDF/DOCX/TXT) and audio uploads
    abortOnLimit: true,
    responseOnLimit: JSON.stringify({ success: false, message: 'File is too large - maximum size is 10MB' }),
    safeFileNames: true,
    preserveExtension: 4,
    useTempFiles: false, // keep the memory-buffer approach sir — Parsers.js reads file.data as a Buffer
}))

// GET endpoint the frontend calls once on load (and again after login) to obtain a CSRF token sir —
// deliberately NOT behind doubleCsrfProtection, fetching the token itself can't require already having one
app.get('/api/v1/csrf-token', (req, res) => {
    res.json({ success: true, csrfToken: generateCsrfToken(req, res) })
})

// generous global rate limit sir — the tight per-route ones live in the route files
app.use(globalLimiter)

app.use('/api/v1', auth)
app.use('/api/v1', notes)
app.use('/api/v1', chat)
app.use('/api/v1', studyKit)
app.use('/api/v1', external)
app.use('/api/v1', payment)
app.use('/api/v1', analytics)
app.use('/api/v1', admin)
app.use('/api/v1', contact)

app.get('/', (req, res) => {
    return res.json({
        success: true,
        message: 'Your server is up and running ...',
    })
})

// health-check endpoint sir — point Render's "Health Check Path" at /health so a bad
// deploy is detected and rolled back instead of serving errors
app.get('/health', (req, res) => {
    return res.status(200).json({ success: true, uptime: process.uptime() })
})


// catches invalidCsrfTokenError (and anything else that reaches here) sir — without this,
// Express's default HTML error page would leak a stack trace and break the frontend's JSON parsing
app.use((err, req, res, next) => {
    if (err === invalidCsrfTokenError) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or missing CSRF token, please refresh the page and try again',
        })
    }
    console.log(err)
    return res.status(500).json({
        success: false,
        message: 'Something went wrong',
    })
})

// production startup order sir — connect the DB FIRST, only then accept traffic; otherwise the
// first requests after a deploy race the connection and fail with buffering timeouts
const startServer = async () => {
    await connectDB()

    // weekly summary email sir — in-process cron, no separate infra needed since the
    // web service process stays alive on Render
    scheduleWeeklyDigest()

    const server = app.listen(Port, () => {
        console.log(`Server running on port ${Port}`.bgGreen.black.bold)
    })

    // Render sends SIGTERM on every redeploy sir — finish in-flight requests instead of
    // dropping them mid-response, then exit so the new instance takes over
    process.on('SIGTERM', () => {
        console.log('SIGTERM received — shutting down gracefully'.bgRed.white.bold)
        server.close(() => process.exit(0))
    })
}

startServer()
