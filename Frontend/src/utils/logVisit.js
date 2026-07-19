// Fires a tiny ping at POST /api/v1/visit on every route change sir — powers the admin
// Traffic dashboard's unique-visitor/total-visit charts. Plain fetch instead of the shared
// axios instance on purpose: no CSRF token needed (the route is public + unauthenticated),
// and a failed ping must never surface to the user or block navigation.
//
// credentials:'include' matters here sir — that's what lets the backend set/read the
// anonymous visitor_id cookie (Backend/Middlewares/Visitor.js) that de-dupes visitors.
const VISIT_URL = import.meta.env.VITE_MAIN_BACKEND_URL + '/visit'

export function logVisit(path) {
    fetch(VISIT_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
        keepalive: true,
    }).catch(() => { /* best-effort sir — never surfaces to the user */ })
}
