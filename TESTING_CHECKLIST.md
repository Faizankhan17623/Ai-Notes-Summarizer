# Manual Testing Checklist — Notewise

Mark each row as you test: write **Working** or **Not Working** in the Status column.

## Auth & Account Security

| # | Functionality | Status |
|---|---|---|
| 1 | Signup with OTP email verification | |
| 2 | Login (email + password) | |
| 3 | JWT session persists across page refresh | |
| 4 | Logout (clears session) | |
| 5 | Forgot password → email link | |
| 6 | Reset password via emailed link | |
| 7 | Change password from Account page | |
| 8 | Rate limiting on login/signup/OTP (try rapid repeated attempts) | |
| 9 | Account lockout after 5 failed logins | |
| 10 | Account ban enforcement (admin bans a user, user is blocked) | |
| 11 | Soft-delete account (schedules deletion) | |
| 12 | Recover account within 2-day buffer | |
| 13 | Role-based access (User/Support/Admin routes blocked appropriately) | |
| 14 | File upload validation rejects fake/mismatched file types | |

## Notes / Summarization

| # | Functionality | Status |
|---|---|---|
| 15 | Create summary from pasted/typed text | |
| 16 | Create summary from uploaded PDF | |
| 17 | Create summary from uploaded DOCX | |
| 18 | Create summary from uploaded TXT | |
| 19 | Create summary via voice dictation | |
| 20 | Basic plan summary depth (title, TL;DR, key points, action items) | |
| 21 | Pro plan summary depth (+ sections, key terms) | |
| 22 | Pro Max summary depth (+ initial quiz & flashcards) | |
| 23 | Credit gating enforced (blocked after monthly limit hit) | |
| 24 | AI-suggested tags shown at creation | |
| 25 | Note detail/Report page renders full summary | |
| 26 | Delete a note (cascades chats/flashcards/quizzes) | |
| 27 | History page search (full-text) | |
| 28 | History page filter by tag/folder/pinned | |
| 29 | Pin / unpin a note | |
| 30 | Organize: add tags, assign folder | |
| 31 | Public share link (read-only view works, no login needed) | |
| 32 | Export note as Markdown | |
| 33 | Export note as PDF | |
| 34 | Export note as DOCX | |
| 35 | Dashboard home stat tiles show correct numbers | |

## Chat With Notes

| # | Functionality | Status |
|---|---|---|
| 36 | Start a chat grounded in a specific note | |
| 37 | Chat answers stay scoped to that note's content | |
| 38 | Chat history persists (revisit chat later) | |
| 39 | Voice-dictate a chat message | |
| 40 | Delete a chat | |
| 41 | Message cap enforced per plan | |

## Study Kit — Flashcards

| # | Functionality | Status |
|---|---|---|
| 42 | Generate flashcards on-demand from a note | |
| 43 | Flashcards avoid duplicating existing fronts | |
| 44 | Flip-card UI works (front/back) | |
| 45 | Review queue shows all due cards across notes | |
| 46 | Rate a card (again/hard/good/easy) updates due date | |
| 47 | Daily review streak increments | |
| 48 | Export review queue as PDF | |
| 49 | Delete a flashcard | |

## Study Kit — Quizzes

| # | Functionality | Status |
|---|---|---|
| 50 | Generate a quiz on-demand from a note | |
| 51 | Take quiz one question at a time | |
| 52 | Submit quiz and see scored results + explanations | |
| 53 | Retake quiz (overwrites last attempt) | |
| 54 | Delete a quiz | |

## Plans, Credits & Payments

| # | Functionality | Status |
|---|---|---|
| 55 | Pricing page displays all 3 plans correctly | |
| 56 | Credit usage updates after each AI action | |
| 57 | Credit cycle resets after 30 days | |
| 58 | Buy a credit top-up pack | |
| 59 | Razorpay checkout flow (or "coming soon" stub) | |
| 60 | Plan reverts to Basic after subscription expires | |

## Account / Settings

| # | Functionality | Status |
|---|---|---|
| 61 | View plan, credits, activity stats on Account page | |
| 62 | Edit first name | |
| 63 | Edit last name | |
| 64 | Toggle weekly digest email preference | |
| 65 | Generate API key (Pro/Pro Max) | |
| 66 | Revoke API key | |
| 67 | Use API key to call /external/summarize | |
| 68 | Delete account button triggers 2-day buffer | |
| 69 | Recover scheduled deletion banner appears/works | |

## Analytics (User-Facing)

| # | Functionality | Status |
|---|---|---|
| 70 | Activity chart (notes/day, 30-day) renders | |
| 71 | Totals (notes/chats/flashcards) are accurate | |
| 72 | Quiz average score displayed correctly | |

## Admin Panel

| # | Functionality | Status |
|---|---|---|
| 73 | Overview page loads (totals, AI call stats) | |
| 74 | Analytics page (revenue, signups charts) | |
| 75 | Users list — search/paginate | |
| 76 | Ban a user (with reason) | |
| 77 | Unban a user | |
| 78 | Change a user's role | |
| 79 | Payments history table loads | |
| 80 | Audit log shows admin actions | |
| 81 | AI usage/cost monitor feed loads | |
| 82 | Publish a site-wide announcement | |
| 83 | Announcement appears on public pages | |
| 84 | Deactivate an announcement | |

## Site-Wide / Misc UI

| # | Functionality | Status |
|---|---|---|
| 85 | Light/dark theme toggle (persists on refresh) | |
| 86 | Announcement banner is dismissible | |
| 87 | Sidebar nav + credit-usage progress bar update live | |
| 88 | Routes lazy-load with spinner (no blank flash) | |
| 89 | Scroll position resets on route change | |
| 90 | Toast notifications appear for key actions | |
| 91 | Confirm dialogs block destructive actions (delete note/account/etc.) | |

## Background Jobs

| # | Functionality | Status |
|---|---|---|
| 92 | Weekly digest email sends on schedule (Mondays) | |
