# PitchPulse — Phase 5 Context File
Paste this entire file into a new chat to bring Claude fully up to speed.

---

## Project Overview

**PitchPulse** is a full-stack AI-powered pre-meeting sales brief generator built for the BITSoM Product Management with Agentic AI Cohort 2 final project (PS4). The problem statement: *"How might we design an AI-powered agent to automatically curate and deliver timely, contextual company insights—sourced from financial data, news, and social media—to sales representatives before meetings so that they are better informed and reduces manual research time for them?"*

PitchPulse answers every word of that PS with a 3-agent CrewAI pipeline (Researcher → Analyst → Formatter) that generates structured, sourced company briefs in 15–90 seconds.

**BITSoM Final Project + Exam Deadline: June 10, 2026.**

---

## Live Production URLs

- **Frontend:** https://pitch-pulse-sigma.vercel.app
- **Backend:** https://pitchpulse-api-f8ep.onrender.com
- **GitHub:** https://github.com/SannidhiSriram-06/PitchPulse (private)

---

## Local Project Path

```
/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/
├── backend/
│   ├── app.py           # Flask app, all routes
│   ├── agents.py        # CrewAI agents + crews
│   ├── tools.py         # Tavily search + Alpha Vantage financial tool
│   ├── models.py        # SQLAlchemy models
│   ├── database.py      # DB init
│   ├── auth.py          # JWT auth, validators
│   ├── config.py        # Config from env vars
│   ├── requirements.txt
│   ├── render.yaml      # rootDir: backend, plan: free, python 3.12
│   └── .python-version  # 3.11.9 locally (3.12 on Render)
└── frontend/
    ├── src/
    │   ├── pages/       # All page components
    │   ├── components/  # Shared components
    │   ├── store/       # Zustand stores
    │   ├── hooks/       # Custom hooks
    │   └── lib/api.js   # Axios instance
    ├── public/          # icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png
    ├── vite.config.js   # Vite + VitePWA + TailwindCSS
    ├── vercel.json
    └── .npmrc           # legacy-peer-deps=true
```

---

## Tech Stack

### Backend
- **Python 3.12** (Render) / **3.11.9** (local)
- **Flask 3.0.3** + Flask-SQLAlchemy + Flask-CORS + Flask-Limiter + Flask-Talisman
- **CrewAI 1.14.4** — multi-agent orchestration
- **Groq** (via LiteLLM) — LLM inference
- **Tavily Python 0.5.0** — real-time web search tool
- **Alpha Vantage** — real financial data (stock price, market cap, revenue, P/E, EPS, employees)
- **Resend** — transactional email (forgot password + meeting email reminder)
- **PostgreSQL** on Render (Supabase migration PENDING — Render DB expires June 2, 2026)
- **JWT (PyJWT)** + **bcrypt** for auth
- **gunicorn** — production WSGI server (`gunicorn "app:create_app()" --timeout 120`)

### Frontend
- **React 18** + **Vite 8**
- **Tailwind CSS v4** (via @tailwindcss/vite)
- **Zustand** — state management (authStore, briefStore, prefsStore, themeStore)
- **driver.js** — guided product tour
- **jsPDF + html2canvas** — PDF export
- **VitePWA** — installable PWA (Android, iOS, Desktop)
- **Axios** with interceptors (auto-attach JWT, redirect to /login on 401 except share pages)

---

## Database Models (PostgreSQL)

### User
- id, email, password_hash, created_at
- preferences (JSON string — default_length, default_view, show_sources, show_watchlist)
- brief_count, hour_window_start (rate limiting)
- reset_token, reset_token_expiry (forgot password flow)

### Brief
- id, user_id (FK), company_name, length, brief_json (full output), sections_requested (comma string)
- sources_used (JSON array of URL strings), limited_data (bool)
- share_token (secrets.token_urlsafe(32)), created_at
- scheduled_meeting_time (nullable DateTime, for meeting email feature)

### Watchlist
- id, user_id (FK), company_name, last_briefed_at, added_at

### WatchlistNote
- id, user_id (FK), company_name, note_text, created_at, updated_at
- UNIQUE constraint on (user_id, company_name)

---

## Backend Architecture

### Flask App Factory
`create_app()` in `app.py` — uses factory pattern. Gunicorn starts with `app:create_app()`.

### Rate Limiting
- `/api/brief` and `/api/brief/compare`: per-user hourly window (stored in User model)
- `/api/auth/login`: 5/min via Flask-Limiter
- `/api/auth/register`: 3/min via Flask-Limiter
- In-memory storage (resets on restart — fine for free tier)

### Agent Pipeline (agents.py)

**Single Company Brief — `build_crew(company_name, length, sections, custom_prompt)`:**
1. **Researcher Agent** — uses `company_web_search` (Tavily) + `company_financial_data` (Alpha Vantage). Runs 4 searches: latest news, products/services, competitors, financials. max_iter=8.
2. **Analyst Agent** — no tools, receives researcher output, writes strategic analysis for requested sections.
3. **Formatter Agent** — no tools, outputs strict JSON matching the sections schema.

**Comparison Brief — `build_comparison_crew(company1, company2, length)`:**
1. **Researcher 1** — researches company1 only (2 searches: latest news + financial data)
2. **Researcher 2** — researches company2 only (2 searches: latest news + financial data)
3. **Analyst** — compares both across financials, market position, news, strengths/weaknesses
4. **Formatter** — outputs JSON with keys: company1_summary, company2_summary, financial_comparison, market_position, recent_developments, strengths_weaknesses, recommendation

**Custom Prompt Handling:**
- When `custom_prompt` is provided, `custom_focus` is appended to sections list
- Analyst and Formatter both get explicit instructions to produce a `custom_focus` JSON key
- The CRITICAL REQUIREMENT language forces the model to include it reliably

### All API Routes

**Auth:**
- `POST /api/auth/register` — email + password validation (strict: 8+ chars, uppercase, number, special char)
- `POST /api/auth/login` — returns JWT
- `GET /api/auth/me` — current user
- `POST /api/auth/change-password`
- `DELETE /api/auth/account` — cascade deletes everything
- `POST /api/auth/forgot-password` — generates reset_token, sends Resend email
- `POST /api/auth/reset-password` — validates token expiry, updates password

**User:**
- `GET/PATCH /api/user/preferences`

**Brief:**
- `POST /api/brief` — generate single company brief
- `POST /api/brief/compare` — generate comparison brief (counts as 2 rate limit credits)
- `GET /api/briefs` — list user's briefs
- `GET /api/briefs/<id>` — get single brief
- `DELETE /api/briefs/<id>` — delete brief
- `PATCH /api/briefs/<id>/save`
- `GET/POST /api/briefs/<id>/share` — generate share token
- `GET /api/share/<share_token>` — **PUBLIC, no auth** — view shared brief
- `POST /api/briefs/<id>/schedule` — send brief via email (Resend), saves scheduled_meeting_time
- `GET /api/briefs/company/<company_name>/diff` — sentence-level diff between 2 most recent briefs for company

**Watchlist:**
- `GET/POST /api/watchlist`
- `DELETE /api/watchlist/<id>`
- `GET /api/watchlist/alerts` — real-time news check for up to 5 watchlist companies
- `GET /api/watchlist/notes/<company_name>`
- `POST /api/watchlist/notes/<company_name>` — upsert note

**Health:**
- `GET /api/health` — returns `{"status": "ok"}`

---

## Frontend Pages & Components

### Pages (src/pages/)
- **LandingPage.jsx** — updated hero copy: "Know your prospect. Before you walk in."
- **AuthPage.jsx** — register + login. Strict password strength indicator. "Forgot password?" link on login form only.
- **OnboardingPage.jsx** — sets default_length and default_view, syncs to backend
- **DashboardPage.jsx** — main app view. Stats bar (total briefs, watchlist count, last brief). 3-col responsive brief grid. Watchlist sidebar with red news dot, 📝 CRM notes, "Last briefed X ago". Guided tour triggers on first load (if tour_completed not in localStorage). Mobile drawer.
- **BriefGeneratorPage.jsx** — Single / Compare Two toggle. Meeting type templates (Cold Call, First Meeting, Partnership, Renewal). Section toggles. Custom focus textarea (500 char, counter). For comparison: shows templates + custom prompt, hides sections.
- **BriefDisplayPage.jsx** — displays brief in tabs or cards view. Navbar has: Save, Share, Export PDF, 📅 Schedule, 🔄 What's New. Sections: summary, news, financials, social_sentiment, talking_points, watch_out_for, custom_focus. Comparison keys: company1_summary, company2_summary, financial_comparison, market_position, recent_developments, strengths_weaknesses, recommendation. Share view hides all auth-required buttons + banner only shows to logged-out users.
- **HistoryPage.jsx** — full brief history
- **SettingsPage.jsx** — preferences (default_length, default_view, show_sources, show_watchlist), change password, delete account
- **ForgotPasswordPage.jsx** — email input, shows success message on submit
- **ResetPasswordPage.jsx** — reads token from URL params, validates, resets password

### Components (src/components/)
- **ProtectedRoute.jsx** — wraps auth-required routes
- **CustomizePanel.jsx** — slide-out panel. Theme toggle uses themeStore (not prefsStore). Other prefs sync to backend.
- **RateLimitModal.jsx** — shows rate limit with actual reset_in_minutes from backend. Has X close button top-right.
- **WatchlistSidebar.jsx** — desktop sidebar
- **Skeletons.jsx** — loading skeletons
- **PWAInstallBanner.jsx** — slides up from bottom after 3s. Handles Android (beforeinstallprompt), iOS (manual instructions), Desktop. Respects pwa_dismissed localStorage flag. Only shows if not already installed.

### Stores (src/store/)
- **authStore.js** — user, token, login, logout (clears briefStore.currentBrief on logout)
- **briefStore.js** — currentBrief, generating, statusMessage, generateBrief (posts to /api/brief with company_name, length, sections, custom_prompt), saveBrief (PATCH /api/briefs/:id/save)
- **prefsStore.js** — default_length, default_view, show_sources, show_watchlist. Hydrated from backend.
- **themeStore.js** — dark/light mode. Applies class to document. Independent from prefsStore.

### Hooks (src/hooks/)
- **useTour.js** — driver.js 6-step tour. Targets: #watchlist-sidebar, #generate-brief-btn, #briefs-list, #search-bar, #customize-btn, #tour-help-btn. onDestroyed sets tour_completed in localStorage.
- **useIsMobile.js** — breakpoint detection

### lib/api.js
```js
axios.create({ baseURL: VITE_API_URL, timeout: 120000 })
// Request interceptor: auto-attach JWT from localStorage
// Response interceptor: redirect to /login on 401
//   EXCEPT: no redirect if window.location.pathname.startsWith('/brief/share/')
```

---

## App Router (App.jsx)
```
/ → LandingPage
/login → AuthPage
/register → AuthPage
/onboarding → ProtectedRoute(OnboardingPage)
/dashboard → ProtectedRoute(DashboardPage)
/brief/new → ProtectedRoute(BriefGeneratorPage)
/brief/:id → ProtectedRoute(BriefDisplayPage)
/brief/share/:token → BriefDisplayPage (NO auth wrapper — public)
/history → ProtectedRoute(HistoryPage)
/settings → ProtectedRoute(SettingsPage)
/forgot-password → ForgotPasswordPage
/reset-password → ResetPasswordPage
```

---

## Environment Variables

### Backend (.env + Render environment)
```
GROQ_API_KEY=...
TAVILY_API_KEY=...
SECRET_KEY=...  (secrets.token_hex(32))
JWT_SECRET_KEY=...  (secrets.token_hex(64))
DATABASE_URL=...  (PostgreSQL connection string)
FRONTEND_URL=https://pitch-pulse-sigma.vercel.app
CREWAI_TRACING_ENABLED=false
RESEND_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
```

### Frontend (Vercel)
```
VITE_API_URL=https://pitchpulse-api-f8ep.onrender.com
```

---

## Deployment

### Render (Backend)
- Blueprint deploy using `backend/render.yaml`
- rootDir: backend, plan: free, Python 3.12
- Database: pitchpulse-db (free PostgreSQL) — **EXPIRES JUNE 2, 2026**
- Keep-alive: cron-job.org pings `/api/health` every 10 min (prevents free tier spin-down)
- Single gunicorn worker (WEB_CONCURRENCY=1 auto-set by Render)
- 512MB RAM — brief generation blocks the single worker during AI calls

### Vercel (Frontend)
- Root directory: `frontend`
- Framework: Vite (auto-detected)
- .npmrc sets `legacy-peer-deps=true` (needed for vite-plugin-pwa with Vite 8)
- Auto-deploys on push to main

### DB Migrations
Render free tier has no shell access. Pattern used throughout:
1. Add a temporary POST `/api/admin/migrate-xxx` route with a secret header check
2. Push, wait for deploy, curl it
3. Remove route, push again

Migrations already run on prod:
- `reset_token`, `reset_token_expiry` columns on `users` table
- `watchlist_notes` table
- `scheduled_meeting_time` column on `briefs` table

---

## Security Hardening (Done)
- Flask-Limiter: 5/min on login, 3/min on register
- Flask-Talisman: security headers (force_https=False, CSP=False, frame_options=DENY)
- MAX_CONTENT_LENGTH = 1MB
- bcrypt 12 rounds
- Constant-time password check (dummy hash to prevent timing attacks)
- JWT HS256 with expiry
- Input sanitization on company_name (regex)
- No IDOR — all DB queries filter by user_id
- Backend validates password complexity (8+ chars, uppercase, number, special char)
- Rate limiting on brief generation

---

## Features Implemented (All Working on Prod)

1. **Brief Generation** — single company, 6 sections by default, configurable
2. **Competitor Comparison** — "Compare Two" mode, 7 fixed sections, counts as 2 rate limit credits
3. **Custom Focus Prompt** — user-typed context injected into analyst + formatter tasks; generates dedicated `custom_focus` card
4. **Brief Templates** — Cold Call, First Meeting, Partnership, Renewal pre-fill custom prompt
5. **PDF Export** — jsPDF + html2canvas, A4, multi-page, filename: `{company}-brief-{date}.pdf`
6. **Company News Alerts** — red dot on watchlist companies with recent (2025/2026) news
7. **CRM Notes** — inline 📝 textarea per watchlist company, auto-save on blur
8. **Meeting Email Scheduler** — 📅 sends brief as formatted HTML email via Resend immediately
9. **What's New Diff** — 🔄 sentence-level diff between 2 most recent briefs for same company
10. **Forgot Password / Reset Password** — Resend email with reset link, 1hr token expiry
11. **Guided Product Tour** — driver.js, 6 steps, auto-triggers on first login, ? button to replay
12. **PWA Install Banner** — custom slide-up banner for Android, iOS, Desktop
13. **Real Financial Data** — Alpha Vantage (ticker search → quote → overview), falls back to stub if API fails
14. **Share Links** — public URLs, no auth required, banner hidden for logged-in users
15. **Dashboard Redesign** — stats bar, 3-col grid, section badges, richer watchlist sidebar
16. **Light/Dark Mode** — CSS variables throughout, themeStore handles toggle
17. **Timezone Fix** — dates stored as UTC from PostgreSQL (+00:00 format), parsed correctly in browser local timezone
18. **Rate Limit with Timer** — 429 response includes `reset_in_minutes`, shown in modal
19. **Password Strength Indicator** — real-time on register form
20. **Account Deletion** — cascade deletes all briefs, watchlist, notes

---

## Known Issues / Pending Work

### CRITICAL — DB Migration Needed Before June 10
**Render free PostgreSQL expires June 2, 2026.** Must migrate to Supabase (free, no expiry) before that date. Steps:
1. Create Supabase project at supabase.com
2. `pg_dump "RENDER_DB_URL" > pitchpulse_backup.sql`
3. `psql "SUPABASE_URL" < pitchpulse_backup.sql`
4. Update `DATABASE_URL` in Render environment to Supabase connection string

### Minor Issues
- Comparison brief timeout risk on Render free tier — researcher agents reduced to 2 searches each to fit within 120s gunicorn timeout. Long comparison briefs may still timeout. Workaround: always use Short length for comparisons.
- Flask-Limiter warning in logs: "Using in-memory storage for tracking rate limits" — harmless, counters reset on restart
- PWA install banner and tour ? button won't retrigger for users who have `pwa_dismissed` or `tour_completed` in localStorage (expected behavior for returning users, only first-time for new users)

---

## BITSoM Submission Docs (Generated, Partially Complete)

Six markdown files generated at project root:
- `Phase1_submission.md` — Problem statement, ERRC, CVP, competition, revenue model
- `Phase2_submission.md` — Design thinking, personas, JTBD, MVP, AI integration with CrewAI/Groq/Tavily
- `Phase3_submission.md` — 4-week Agile plan, 25 Jira tickets, ethical risks, Lean Canvas
- `Phase4a_submission.md` — STP, 7Ms, launch plan, channel strategy, 60-second pitch
- `Phase4b_submission.md` — Customer service strategy, CLV, growth loops
- `Phase5_prd.md` — Full PRD

**Still needed for submission:**
- Loom demo video (3-4 min walkthrough of live app)
- Add student ID (Sannidhi Durga Pavan Sriram) and team names to top of each doc
- Convert docs to PDF before submitting on LMS

---

## Key Decisions & Architecture Notes

- **Why CrewAI over direct LLM calls:** Agentic pipeline with tool use demonstrates true AI agent behavior for BITSoM PS
- **Why Groq:** Fast inference, free tier sufficient for demo
- **Why Render + Vercel (not Railway, Heroku):** Best free tier combo at time of decision
- **Comparison timeout fix:** Reduced from 4 to 2 web searches per company; sequential process stays
- **No job queue:** Meeting email sends immediately (MVP), not truly "30 min before meeting" — acceptable for demo
- **SQLite locally, PostgreSQL on prod:** Standard Flask-SQLAlchemy setup, db.create_all() handles schema creation
- **Migration pattern:** Temporary route with secret header (no Render shell on free tier)
- **Alpha Vantage integration:** Ticker symbol search first, then quote + overview. Falls back to deterministic stub (based on MD5 hash of company name) if API fails or company not found

---

## Local Dev Setup

```bash
# Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Add .env with all keys
python app.py  # runs on localhost:5001

# Frontend
cd frontend
npm install
# .env.local: VITE_API_URL=http://localhost:5001
npm run dev  # runs on localhost:5173
```

---

## Tools Used for Development
- **Cursor** — primary AI coding assistant (Claude-based)
- **Windsurf** — used when Cursor hit rate limits
- macOS, Warp terminal, Antigravity

---

*Last updated: May 14, 2026. Phase 5 context — deployment complete, all features live, DB migration to Supabase pending.*
