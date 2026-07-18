# Notewise

Turn any notes into a clear, structured summary — paste text, upload a PDF/Word/TXT file, or just talk. Built with an Express + MongoDB backend and a React + Vite frontend, powered by Groq for AI summarization and chat.

## Live demo

- **Frontend:** [ai-notes-summarizer-v2.vercel.app](https://ai-notes-summarizer-v2.vercel.app/)
- **Backend API:** [ai-notes-summarizer-v2.onrender.com](https://ai-notes-summarizer-v2.onrender.com)

## Features

- **Summarize notes** from pasted/typed text, uploaded files (PDF/DOCX/TXT), a pasted article URL, or voice/audio (browser dictation or an uploaded audio file transcribed via Groq) — single or bulk (up to 20 files at once)
- **Chat with your notes** — ask follow-up questions grounded strictly in the note you're viewing
- **Plan-tiered summaries** — Basic (key points + structured action items: tasks/key dates/decisions), Pro (+ sections & key terms), Pro Max (+ an initial quiz & flashcard set) — with real credit gating enforced per plan, and AI-suggested tags applied automatically at creation time
- **On-demand flashcards & quizzes** (Pro/Pro Max) — generate more of either from any note at any time; flashcards use SM-2 spaced repetition (again/hard/good/easy) with a dedicated Review page for everything due across all notes; export a full deck or quiz (with answer key) as a printable PDF
- **Organize & find notes** — tags, folders, pin/favorite, full-text search, and a "related notes" panel based on tag overlap
- **Pick your model** (Pro/Pro Max) — choose which Groq model powers your summaries/chat/study tools instead of the plan default
- **Auth** — signup with OTP email verification, JWT (httpOnly cookie + bearer), forgot/reset password, 2-day account delete/recover buffer
- **In-app notifications** — polled updates for things like low credits, plan expiry, and support replies
- **Role-based Admin & Support dashboards** — Support gets a read-only/reply view (users, payments, AI logs, contact tickets — with private handoff notes on each ticket); Admin adds ban/role changes, refunds (including credit-pack refunds), audit log, and site-wide announcements
- **Payments** — Razorpay integration with plan purchases and one-time credit top-up packs

## Tech stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Groq SDK, `pdf-parse`, `mammoth` (docx), `pdfkit`/`docx` (export), Nodemailer (+ Brevo HTTP API fallback), `node-cron`, `express-rate-limit`, Helmet, `csrf-csrf`

**Frontend:** React 19, Vite, Redux Toolkit, Tailwind CSS v4, Axios, React Router, react-hook-form, react-hot-toast

## Project structure

```
NotesSummarizer/
├── Backend/            Express API (Routes, controllers, Models, Middlewares, utils)
└── Frontend/           React app (Components, Services, Slices, Hooks)
```

## Getting started

### Backend

```bash
cd Backend
npm install
```

Create `Backend/.env` (see `.env` keys already scaffolded) with:

```
PORT=4000
MONGO_DB_URL=your MongoDB Atlas connection string
JWT_PRIVATE_KEY=any long random string
GROQ_API_KEY=free key from console.groq.com
FRONTEND_URL=http://localhost:5173
MAIL_HOST=smtp.gmail.com          # optional, needed for OTP/reset emails
MAIL_USER=
MAIL_PASS=
RAZORPAY_KEY_ID=                  # optional, leave blank for payments stub mode
RAZORPAY_KEY_SECRET=
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

`npm run dev` (run from `Frontend/`) starts **both** the backend and frontend together via `concurrently` — no need for two terminals.

Frontend env (`Frontend/.env`):

```
VITE_MAIN_BACKEND_URL=http://localhost:4000/api/v1
```

## License

Personal project — all rights reserved.

<!--
FULL FEATURE INVENTORY (internal notes — not for public README, keep inside this comment block)

AUTH & ACCOUNT SECURITY
- Signup with OTP email verification (6-digit code, 5-min expiry)
- Login via JWT: httpOnly access token (1h) + httpOnly refresh token (7d, hashed in DB), bearer-token fallback
- Logout revokes refresh token server-side, clears cookies
- Forgot / reset password via emailed time-limited token
- Change password from Account page (invalidates refresh token)
- Brute-force protection: per-IP rate limits (login/signup/OTP/AI) + 5-failed-logins -> 15-min self-healing lockout
- Account ban/suspend enforced at Auth middleware
- Soft-delete with 2-day recovery buffer, auto-recovers on login within window
- RBAC roles: User / Support / Admin (PrivateRoute / AdminRoute / OpenRoute on frontend)
- CSRF double-submit cookie protection
- Magic-byte file upload validation (PDF/DOCX/TXT), not just extension/mimetype

NOTES / SUMMARIZATION
- Create summary from pasted text, uploaded file (PDF/DOCX/TXT), or voice dictation (Web Speech API, no API cost)
- Plan-tiered summary depth:
  - Basic: title, TL;DR, key points, action items (tasks/keyDates/decisions), AI-suggested tags
  - Pro: + topic sections, key terms/definitions
  - Pro Max: + initial quiz + initial flashcard set generated inline
- Credit-gated generation (monthly cycle: Basic 5 / Pro 100 / ProMax unlimited) + purchasable top-up credits
- AI-suggested tags (2-3 topics) at creation time
- Note detail "Report" page: full summary render, embedded Study Tools, Organize + Share/Export rail, delete (cascades chats/flashcards/quizzes), jump into Chat
- History page: full-text search (Mongo text index over title+rawText), filter by tag/folder/pinned, pin/unpin, delete
- Organize: free-form tags, single folder, pin-to-top
- Public share links (read-only, summary only — never raw text/flashcards/quiz)
- Export note as Markdown, PDF, or DOCX
- Dashboard home: stat tiles (notes this week/total/credits left/streak), recent notes, activity analytics widget

CHAT WITH NOTES
- Chat grounded in one specific note; AI restricted to that note's content
- Plan-based context depth: Basic 10 / Pro 20 / ProMax 40 past turns replayed
- Plan-based capability scope: Basic light Q&A, Pro adds quizzes/flashcards/reorganize on request, Pro Max full study coach (mock exams, multi-day study plans)
- Plan-based message caps: Basic 60 / Pro 200 / ProMax unlimited per chat
- Chat list sidebar + conversation view, voice-dictate messages, delete chat

STUDY KIT - FLASHCARDS
- On-demand flashcard generation per note (Pro/ProMax only, 1 credit), avoids duplicate fronts
- SM-2 spaced repetition (ease factor, interval, review count, due date; again/hard/good/easy ratings)
- Review queue page: every card due now across ALL notes, flip-card UI
- Daily review streak tracking
- Export the due review queue OR one note's full deck (regardless of due date) as a printable PDF
- Per-note flashcard browsing/deletion on Report page

STUDY KIT - QUIZZES
- On-demand MCQ quiz generation per note (Pro/ProMax only, 1 credit), avoids repeating prior questions
- One-question-at-a-time player, submit all at once, scored with per-question correct/incorrect + explanations
- Retake overwrites lastAttempt; quiz deletable
- Export a quiz as a printable PDF (questions + options, answer key on a separate page)

PLANS, CREDITS & PAYMENTS
- Three tiers: Basic (free, 5 credits/mo), Pro (Rs499/mo, 100 credits), Pro Max (Rs1499/mo, unlimited)
- Lazy 30-day rolling credit cycle per user (auto-resets, no cron needed)
- One-time credit top-up packs (small/medium/large: 20/50/100 credits)
- Razorpay checkout: order creation + HMAC signature verification (stub "coming soon" mode until live keys added)
- Public Pricing page with plan comparison + credit pack purchase, current-plan highlight
- Subscription auto-reverts to Basic after SubscriptionExpires

ACCOUNT / SETTINGS
- View plan, credits used/remaining, bonus credits, total activity, study streak
- Buy credit top-up packs inline
- Edit first/last name separately
- Toggle weekly digest email preference
- Change password
- Pro/ProMax API key management: generate (nsk_... shown once, SHA-256 hash stored), view status, revoke
  -> used via POST /external/summarize with x-api-key header for programmatic summarization
- Delete account (2-day recovery) / recover scheduled deletion (banner shown when active)

ANALYTICS (USER-FACING)
- Personal activity dashboard: notes/day (30-day area chart), total notes/chats/flashcards, cards reviewed,
  quizzes attempted + average score, plan credit limit — embedded on Dashboard home

ADMIN & SUPPORT PANELS (RBAC-gated, shared AdminLayout sidebar)
- Support (isSupport — Support role AND Admin both pass): Overview, Users (read-only), Payments
  (read-only), AI usage/cost log (read-only), Contact/ticket inbox with reply-and-resolve
- Support ticket workflow (ContactMessage model doubles as a lightweight ticket system):
  public contact form -> saved + emailed to site owner -> Support/Admin replies (emails the
  submitter, marks resolved) -> private internal notes thread per ticket (text/author/timestamp,
  Support/Admin only, never emailed or exposed publicly) for handoff context between agents
- Admin only (isAdmin, everything above plus): ban/unban (with reason)/role change, payment
  refunds (including credit-pack refunds, restores credits), audit log, site-wide announcements
- Overview: total users/notes/chats, AI calls & failures (24h), plan breakdown
- Analytics: revenue by day/week/month, signups (30-day bar chart), top 20 users by usage,
  users-at-credit-limit counts, credit top-up revenue/stats
- Audit: admin action log (ban/unban/set_role/refund/create_announcement/etc.) + AI usage/cost
  monitor feed (type, plan, model, tokens, latency, success/fail per Groq call)
- Announcements: publish site-wide banner (deactivates prior), history, deactivate;
  consumed publicly by AnnouncementBanner on every page (no login required)

SITE-WIDE / MISC UI
- Light/dark theme toggle, persisted
- Announcement banner (dismissible)
- Dev/under-construction banner
- Persistent dashboard sidebar nav + live credit-usage progress bar
- Lazy-loaded/code-split routes with spinner fallback, scroll-restore on route change
- Toast notifications (react-hot-toast) + confirm dialogs (SweetAlert2) for destructive actions

THIRD-PARTY INTEGRATIONS
- Groq (LLM inference) for summarization/chat/flashcards/quizzes — all calls logged to AiLog for cost monitoring
- Razorpay (payment orders + signature verification, stub mode)
- Nodemailer/SMTP: OTP email, password reset, account-deletion notice, weekly digest (no-ops if SMTP unset)
- Browser Web Speech API: voice dictation for note input and chat messages (no external API key)
- MongoDB Atlas as primary datastore

BACKGROUND JOBS
- Weekly digest email: node-cron, Mondays 08:00 server time, per opted-in non-banned user,
  summarizes notes created/chats had/flashcards due/quizzes taken; skips empty weeks; sequential sends

DATA MODELS (MongoDB / Mongoose)
- User, Note, Flashcard, Quiz, Chat, Payment, AiLog, AuditLog, Announcement, Notification,
  ContactMessage (incl. internalNotes subdocs), OTP
  (see Backend/Models/*.js for full field lists)

FULL FRONTEND ROUTES
- Public: /, /Pricing, /Contact, /shared/:shareId
- Logged-out only: /Signup, /Verify-Otp, /Login, /forgot-password, /reset-password/:token
- Dashboard: /Dashboard, /Dashboard/New-Summary, /Dashboard/Note/:noteId, /Dashboard/Review,
  /Dashboard/History, /Dashboard/Chats, /Dashboard/Chat/:chatId, /Dashboard/Account
- Admin/Support: /Admin, /Admin/Analytics, /Admin/Users, /Admin/Payments, /Admin/Audit,
  /Admin/Announcements, /Admin/Contact-Messages

FULL BACKEND API MAP (/api/v1)
- Auth: POST /Send-otp, POST /Createuser, POST /Login, POST /forgot-password, POST /reset-password,
  POST /refresh-token, POST /logout, GET /profile, PATCH /profile/first-name, PATCH /profile/last-name,
  PATCH /profile/digest-preference, PATCH /profile/password, DELETE /profile, POST /profile/recover,
  GET/POST/DELETE /api-key
- Notes: POST /summarize, GET /shared/:shareId, GET /notes, GET /notes/tags, GET /notes/:noteId,
  DELETE /notes/:noteId, PATCH /notes/:noteId/organize, POST/DELETE /notes/:noteId/share,
  GET /notes/:noteId/export/:format
- Study Kit: POST/GET /notes/:noteId/flashcards, GET /notes/:noteId/flashcards/export,
  GET /flashcards/due, GET /flashcards/review/export, POST /flashcards/:id/review,
  DELETE /flashcards/:id, POST/GET /notes/:noteId/quiz(zes), GET /quizzes/:quizId/export,
  POST /quizzes/:id/attempt, DELETE /quizzes/:id
- Chat: POST /chat, POST /chat/:chatId/message, GET /chat, GET /chat/:chatId, DELETE /chat/:chatId
- Payment: GET /payment/plans, POST /payment/order, POST /payment/verify
- Analytics: GET /analytics/me
- Notifications: GET /notifications, PATCH /notifications/:id/read, PATCH /notifications/read-all
- Contact: POST /contact (public)
- Admin: GET /announcements/active (public), GET /admin/overview, GET /admin/analytics, GET /admin/users,
  PATCH /admin/users/:id/ban|unban|role, GET /admin/payments, PATCH /admin/payments/:id/refund,
  GET /admin/audit, GET /admin/ai-logs, GET /admin/contact-messages,
  POST /admin/contact-messages/:id/reply, POST /admin/contact-messages/:id/notes,
  GET/POST /admin/announcements, PATCH /admin/announcements/:id/deactivate
- External: POST /external/summarize (API-key auth)
- Misc: GET /csrf-token
-->

