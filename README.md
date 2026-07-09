# AI Notes Summarizer

Turn any notes into a clear, structured summary — paste text, upload a PDF/Word/TXT file, or just talk. Built with an Express + MongoDB backend and a React + Vite frontend, powered by Groq for AI summarization and chat.

## Features

- **Summarize notes** from pasted/typed text, PDF, DOCX, TXT, or voice dictation (browser Web Speech API — no extra API key needed)
- **Chat with your notes** — ask follow-up questions grounded strictly in the note you're viewing
- **Plan-tiered summaries** — Basic (key points + structured action items: tasks/key dates/decisions), Pro (+ sections & key terms), Pro Max (+ an initial quiz & flashcard set) — with real credit gating enforced per plan
- **On-demand flashcards** (Pro/Pro Max) — generate more flashcards from any note at any time, independent of the initial summary
- **Spaced-repetition review** — flashcards are scheduled with an SM-2-based algorithm (again/hard/good/easy ratings); a dedicated Review page shows every card due across all your notes
- **On-demand quizzes** (Pro/Pro Max) — generate fresh multiple-choice quizzes from any note, take them, and see a scored result with explanations
- **Auth** — signup with OTP email verification, JWT (httpOnly cookie + bearer), forgot/reset password, 2-day account delete/recover buffer
- **Admin dashboard** — user management (ban/roles), AI usage/cost monitor, payments, audit log, site-wide announcements
- **Payments** — Razorpay integration, currently in "coming soon" stub mode until live keys are added

## Tech stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Groq SDK, `pdf-parse`, `mammoth` (docx), Nodemailer, `express-rate-limit`, Helmet

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
