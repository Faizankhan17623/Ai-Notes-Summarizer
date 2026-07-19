// Render's free tier spins the backend down after ~15 min of no traffic sir, and the next
// request then eats a 30-60s cold start. So the moment ANYONE lands on the site we fire a
// tiny ping at /health — "hey sir, wake up, we have arrived" — so the server is already
// booting (or booted) by the time the user actually clicks Login/Summarize/anything.
//
// Plain fetch instead of the shared axios instance on purpose sir — no cookies, no CSRF,
// no 401-refresh interceptor; this must stay a zero-dependency fire-and-forget ping.

// VITE_MAIN_BACKEND_URL ends in /api/v1 but /health lives at the server root sir
const HEALTH_URL =
    import.meta.env.VITE_MAIN_BACKEND_URL.replace(/\/api\/v1\/?$/, '') + '/health'

const MAX_ATTEMPTS = 4
const RETRY_DELAY_MS = 5000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function wakeUpServer() {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetch(HEALTH_URL, { cache: 'no-store' })
            if (res.ok) return true
        } catch {
            // cold start in progress or network blip sir — wait and try again
        }
        if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS)
    }
    return false
}
