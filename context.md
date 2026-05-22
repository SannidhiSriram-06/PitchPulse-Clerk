# PitchPulse — Project Context

> **Last updated:** Phase 5 complete (2026-05-06)
> **Purpose:** This document is the canonical source of truth for the project.  
> Any AI or developer reading this cold should be able to understand the full project state.

---

## 1. Project Name and Description

**PitchPulse** is a pre-meeting sales intelligence web app.

A sales rep types a company name. Three AI agents (built with CrewAI) then:
1. Research the company using Tavily web search
2. Analyze the findings for strategic sales relevance
3. Format everything into a structured pre-meeting brief

The brief is returned as structured JSON covering: company summary, recent news,
financial overview, social sentiment, talking points, risks/watch-outs, and optionally a custom_focus section.

**Primary user:** B2B sales reps who need 60-second context before walking into a meeting.

**Live URLs:**
- Frontend: https://pitch-pulse-sigma.vercel.app
- Backend: https://pitchpulse-api-f8ep.onrender.com

---

## 2. Full Folder Structure

```
PitchPulse/
├── context.md               ← This file. Full project state documentation.
├── problems_by_cursor.md    ← Codebase audit results (Round 2 complete)
├── backend/
│   ├── app.py               ← Flask app, all API routes (auth + brief + watchlist + prefs + forgot password)
│   ├── auth.py              ← JWT helpers, bcrypt wrappers, require_auth decorator, input validators (strict password rules)
│   ├── agents.py            ← 3 CrewAI agents, their tasks, run_brief() orchestrator, custom_prompt support, custom_focus section
│   ├── tools.py             ← Tavily search tool + realistic financial data stub
│   ├── models.py            ← SQLAlchemy ORM models: User, Brief, Watchlist (+ reset_token, reset_token_expiry on User)
│   ├── database.py          ← SQLAlchemy db instance, init_db() with postgres:// fix
│   ├── config.py            ← Loads .env via dotenv, exposes Config class (includes RESEND_API_KEY, FRONTEND_URL)
│   ├── requirements.txt     ← Python deps (gunicorn, flask-limiter, flask-talisman, resend, litellm, psycopg2-binary)
│   ├── render.yaml          ← Render Blueprint config (plan: free, rootDir: backend, Python 3.12)
│   ├── .python-version      ← Pinned to 3.11.9 locally (3.12.0 on Render)
│   ├── .env                 ← Local secrets (NOT committed to Git)
│   ├── .env.example         ← Template showing required env var names
│   └── venv/                ← Python virtual environment (NOT committed to Git)
└── frontend/                ← Vite + React + Tailwind frontend
    ├── vercel.json          ← Vercel SPA routing config (rewrites all to /)
    ├── vite.config.js       ← VitePWA config with full manifest, icons, workbox
    ├── .npmrc               ← legacy-peer-deps=true (for vite-plugin-pwa@1.2.0 + Vite 8 compat)
    ├── public/
    │   ├── favicon.svg      ← Acid yellow "P" lettermark on black background
    │   ├── favicon-32.png   ← 32x32 PNG favicon
    │   ├── icon-192.png     ← PWA icon 192x192
    │   ├── icon-512.png     ← PWA icon 512x512
    │   └── apple-touch-icon.png ← iOS home screen icon 180x180
    ├── src/
    │   ├── components/      ← ProtectedRoute, WatchlistSidebar, CustomizePanel,
    │   │                       Skeletons, RateLimitModal, PWAInstallBanner
    │   ├── hooks/           ← useIsMobile, useTour (driver.js guided tour)
    │   ├── lib/             ← api.js (axios instance, timeout: 120000ms, JWT interceptor)
    │   ├── pages/           ← Landing, Auth, Onboarding, Dashboard, BriefGenerator,
    │   │                       BriefDisplay, History, Settings, ForgotPassword, ResetPassword
    │   └── store/           ← authStore, briefStore, prefsStore, themeStore
```

---

## 3. Environment Variables

All loaded via `python-dotenv` from `backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | API key for Groq LLM inference. Get from console.groq.com |
| `TAVILY_API_KEY` | ✅ Yes | API key for Tavily web search. Get from app.tavily.com |
| `SECRET_KEY` | ✅ Yes | Flask session secret |
| `JWT_SECRET_KEY` | ✅ Yes | Secret used to sign JWT tokens |
| `JWT_EXPIRY_HOURS` | Optional | How long JWT tokens are valid (default: 24 hours) |
| `DATABASE_URL` | Optional | SQLAlchemy DB string. Defaults to SQLite in dev, PostgreSQL on Render |
| `CREWAI_TRACING_ENABLED` | Optional | Set to `false` to suppress CrewAI trace prompt |
| `FRONTEND_URL` | Optional | Allowed CORS origin. Set to Vercel URL in prod. Defaults to `*` in dev |
| `RESEND_API_KEY` | ✅ Yes (for email) | Resend API key for forgot password emails |

Frontend env vars in `frontend/.env`:

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Optional | Backend URL. Defaults to `http://localhost:5001` if not set |

---

## 4. API Routes

### Auth Flow
Tokens go in the `Authorization` header as `Bearer <token>` on all protected routes.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account. Returns 201 with JWT |
| POST | `/api/auth/login` | No | Login. Returns token + user object |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/auth/change-password` | Yes | Change password |
| DELETE | `/api/auth/account` | Yes | Delete account + all data (cascade) |
| POST | `/api/auth/forgot-password` | No | Send password reset email via Resend |
| POST | `/api/auth/reset-password` | No | Reset password using token from email |
| GET | `/api/user/preferences` | Yes | Get saved preferences |
| PATCH | `/api/user/preferences` | Yes | Merge-update preferences |
| POST | `/api/brief` | Yes | Generate brief. Rate limited 3/hour free |
| GET | `/api/briefs` | Yes | List briefs. Supports `?search=` and `?saved=true` |
| GET | `/api/briefs/:id` | Yes | Get single brief |
| PATCH | `/api/briefs/:id/save` | Yes | Toggle saved boolean |
| DELETE | `/api/briefs/:id` | Yes | Delete brief |
| POST | `/api/briefs/:id/feedback` | Yes | Submit section feedback (up/down) |
| GET/POST | `/api/briefs/:id/share` | Yes | Generate or return share token |
| GET | `/api/share/:token` | No | Public brief access |
| GET | `/api/watchlist` | Yes | List watchlist |
| POST | `/api/watchlist` | Yes | Add company |
| DELETE | `/api/watchlist/:id` | Yes | Remove entry |

### POST /api/brief — Request Shape
```json
{
  "company_name": "Infosys",
  "length": "short|medium|long",
  "sections": ["summary","news","financials","social_sentiment","talking_points","watch_out_for"],
  "custom_prompt": "Optional: focus on their AI strategy and recent layoffs"
}
```

### POST /api/brief — Response Shape
```json
{
  "brief": {
    "summary": { "content": "...", "confidence": "high", "sources": ["url"] },
    "news": { "content": "...", "confidence": "high", "sources": [] },
    "financials": { "content": "...", "confidence": "medium", "sources": [] },
    "social_sentiment": { "content": "...", "confidence": "medium", "sources": [] },
    "talking_points": { "content": "...", "confidence": "high", "sources": [] },
    "watch_out_for": { "content": "...", "confidence": "medium", "sources": [] },
    "custom_focus": { "content": "...", "confidence": "high", "sources": [] }
  },
  "sources_used": ["url1", "url2"],
  "generation_time_ms": 18432,
  "limited_data": false,
  "brief_id": 1,
  "briefs_remaining_this_hour": 2
}
```

Note: `custom_focus` section only appears when `custom_prompt` is provided.

---

## 5. Agent Pipeline (agents.py)

Three sequential CrewAI agents:

**Agent 1 — Company Intelligence Researcher:**
Uses `company_web_search` (Tavily) and `company_financial_data` (stub). Runs 5 sequential searches. Max 8 iterations.

**Agent 2 — Strategic Business Analyst:**
No tools. Receives Agent 1 output. Produces strategic analysis including talking points, risks, and sentiment. If `custom_prompt` provided, appends: "ADDITIONAL FOCUS FROM USER: {custom_prompt}"

**Agent 3 — Pre-Meeting Brief Specialist:**
No tools. Receives both prior outputs. Formats strict JSON. If `custom_prompt` provided, includes mandatory `custom_focus` key. Sections list explicitly includes `custom_focus` when custom_prompt is non-empty.

**Key function:** `run_brief(company_name, length, sections, custom_prompt="")` → returns `{brief, sources_used, limited_data, raw_output}`

---

## 6. Models (models.py)

### User
- id, email, password_hash, tier ("free"/"pro")
- briefs_used_this_hour, hour_window_start (rate limiting)
- preferences (JSON string)
- reset_token, reset_token_expiry (forgot password)
- created_at

### Brief
- id, user_id (FK→User), company_name, length
- sections_requested (comma-separated string)
- brief_json (JSON string of brief object)
- sources_used (JSON string of URL list)
- generation_time_ms, limited_data
- saved (bool), feedback_summary (JSON string)
- share_token (unique URL-safe token)
- created_at

### Watchlist
- id, user_id (FK→User), company_name
- added_at, last_briefed_at

---

## 7. Frontend Architecture

### Stores (Zustand)
- **authStore:** token (localStorage.token), user object, login/logout. Logout also clears briefStore.currentBrief
- **briefStore:** currentBrief, generating, statusMessage, generateBrief(companyName, length, sections, customPrompt)
- **prefsStore:** default_length, default_view, show_watchlist, show_sources. Persisted to localStorage AND synced to backend
- **themeStore:** theme (dark/light), toggleTheme. Applies .dark class to documentElement. Separate from prefsStore

### Key Components
- **PWAInstallBanner:** Slides up from bottom after 3s. Handles beforeinstallprompt (Android/desktop) and iOS Safari fallback. Dismissed state in localStorage('pwa_dismissed')
- **useTour (driver.js):** 6-step guided tour. Auto-triggers on first login (tour_completed not set). Replay via ? button in navbar. IDs: #watchlist-sidebar, #generate-brief-btn, #briefs-list, #search-bar, #customize-btn, #tour-help-btn
- **CustomizePanel:** Theme, default view, show_watchlist, show_sources. Uses themeStore for theme (NOT prefsStore)

### Pages
- **BriefGeneratorPage:** Company input, length selector, section toggles, custom prompt textarea (500 char limit with counter), template buttons (Cold Call/First Meeting/Partnership/Renewal)
- **BriefDisplayPage:** Tabs + cards view, confidence badges, feedback, sources, Save/Share/Export PDF/Schedule buttons. custom_focus renders as last tab. Dates formatted with +Z UTC fix
- **DashboardPage:** Stats bar (total briefs, watchlist count, last brief), 3-col responsive grid, section badges on cards, news alerts red dot, CRM notes (📝 icon, inline textarea, auto-save on blur)
- **ForgotPasswordPage:** Email input → POST /api/auth/forgot-password → success message
- **ResetPasswordPage:** Reads token from URL → POST /api/auth/reset-password → redirect to /login

### Frontend Routes
| Path | Component | Auth |
|---|---|---|
| `/` | LandingPage | No |
| `/login` | AuthPage | No |
| `/register` | AuthPage | No |
| `/forgot-password` | ForgotPasswordPage | No |
| `/reset-password` | ResetPasswordPage | No |
| `/onboarding` | OnboardingPage | Yes |
| `/dashboard` | DashboardPage | Yes |
| `/brief/new` | BriefGeneratorPage | Yes |
| `/brief/:id` | BriefDisplayPage | Yes |
| `/brief/share/:token` | BriefDisplayPage (read-only) | No |
| `/history` | HistoryPage | Yes |
| `/settings` | SettingsPage | Yes |

---

## 8. Design System

- **Background:** `#0A0A0A` (dark), white (light)
- **Accent (dark):** `#C8FF00` (acid yellow)
- **Accent (light):** `#2563EB` (blue — acid yellow too harsh on white)
- **Surface:** `#111111`
- **Font:** Space Grotesk (Google Fonts)
- **PWA:** Full manifest with 192/512 PNG icons, apple-touch-icon, theme-color `#C8FF00`

---

## 9. Security

- **Password:** bcrypt 12 rounds. Strict validation: min 8 chars, uppercase, number, special char — enforced both frontend AND backend
- **JWT:** HS256, 24h expiry, stored in plain `localStorage.token`
- **Rate limiting:** flask-limiter — 5/min on login, 3/min on register
- **Security headers:** flask-talisman (force_https=False, CSP=False, frame_options=DENY)
- **Request size:** MAX_CONTENT_LENGTH = 1MB in Config
- **Input sanitization:** Regex on company_name (alphanumeric + safe chars, max 100 chars)
- **CORS:** Locked to FRONTEND_URL in prod
- **Cascade deletes:** All user data removed on account deletion

---

## 10. Deployment

### Backend (Render)
- Service: `pitchpulse-api` (Free tier, Python 3, Oregon)
- URL: https://pitchpulse-api-f8ep.onrender.com
- DB: `pitchpulse-db` (PostgreSQL 18, Free tier)
- render.yaml: rootDir=backend, plan=free, Python 3.12.0, gunicorn timeout 120s
- Keep-alive: cron-job.org pings /api/health every 10 minutes

### Frontend (Vercel)
- Project: `pitch-pulse`
- URL: https://pitch-pulse-sigma.vercel.app
- Root directory: frontend, Framework: Vite
- Env var: VITE_API_URL = https://pitchpulse-api-f8ep.onrender.com

### DB Migration for New Columns
Render free tier has no shell access. Use the one-time migration route pattern:
- Add temporary `/api/admin/migrate-*` route with secret header check
- Hit it with curl after deploy
- Remove route and redeploy immediately

---

## 11. Known Issues / Watch Out For

1. **macOS AirPlay on port 5000:** Flask runs on 5001.
2. **LiteLLM must be in venv:** Always `source venv/bin/activate` first.
3. **Circular import in database.py:** `import models` must stay inside `init_db()` body.
4. **JSON parse fallback:** `_extract_json()` in agents.py handles markdown fences.
5. **CrewAI tracing:** Add `CREWAI_TRACING_ENABLED=false` to `.env`.
6. **Groq TPM limits:** Wait 30s and retry on 500 with Groq rate limit detail.
7. **CrewAI version:** Pinned to `crewai==1.14.4`. Don't upgrade without testing.
8. **Schema changes in dev:** Delete `backend/instance/pitchpulse.db` and restart. Flask recreates with all columns.
9. **Schema changes in prod:** Use migration route pattern (see Deployment section).
10. **Timezone bug fix:** Brief dates stored as UTC strings without Z. Frontend appends 'Z' before parsing: `new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z')`
11. **Rate limit timezone:** `hour_window_start` from DB is naive. Always do `if window.tzinfo is None: window = window.replace(tzinfo=UTC)` before arithmetic.
12. **vite-plugin-pwa + Vite 8:** Requires `legacy-peer-deps=true` in frontend/.npmrc
13. **Python version:** Local venv uses 3.11.9 (`.python-version` file). Render uses 3.12. Both work.
14. **flask-limiter warning:** "Using in-memory storage" warning is harmless for free tier.
15. **Render free tier spin-down:** Backend sleeps after 15 min inactivity. cron-job.org keeps it alive. axios timeout set to 120s.
16. **parse_error check:** Use `result.get("brief", {}).get("parse_error")` not `result.get("parse_error")`.
17. **custom_focus sections:** Must be added to sections list AND sections_str BEFORE building task descriptions in build_crew().

---

## 12. Features Completed (Phase 5)

### Deployment ✅
- Backend on Render free tier (pitchpulse-api-f8ep.onrender.com)
- Frontend on Vercel (pitch-pulse-sigma.vercel.app)
- PostgreSQL on Render free tier
- cron-job.org keep-alive ping every 10 minutes

### Security Hardening ✅
- flask-limiter on auth endpoints (5/min login, 3/min register)
- flask-talisman security headers
- Strict password validation on backend (not just frontend)
- 1MB request size limit
- Debug mode disabled

### PWA ✅
- Full manifest with 192/512/180 PNG icons generated from favicon.svg
- iOS meta tags (apple-mobile-web-app-capable etc.)
- Custom PWAInstallBanner component (slides up after 3s, handles iOS fallback)
- Installable on Android, iOS, desktop Chrome

### Guided Tour ✅
- driver.js 6-step tour
- Auto-triggers on first login
- Replay via ? button in navbar
- tour_completed localStorage flag

### Forgot Password ✅
- POST /api/auth/forgot-password → generates reset_token, sends email via Resend
- POST /api/auth/reset-password → validates token + expiry (1hr), updates password
- reset_token + reset_token_expiry columns on User model (migrated to prod via migration route)
- ForgotPasswordPage + ResetPasswordPage frontend routes
- "Forgot password?" link on login form

### Dashboard Redesign ✅
- Stats bar: Total Briefs, Watchlist count, Last Brief time
- 3-column responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Brief cards with section badges (parsed from sections_requested)
- Richer watchlist sidebar with last briefed timestamps
- Better empty state with Zap icon and CTA

### Custom Focus Prompt ✅
- Textarea in BriefGeneratorPage (500 char limit, character counter)
- When provided: appended to analyst and formatter task descriptions
- custom_focus added to sections list BEFORE sections_str is built
- Agent 3 generates dedicated `custom_focus` JSON key
- Renders as last tab/card in BriefDisplayPage

### Brief Templates ✅
- 4 templates: Cold Call, First Meeting, Partnership, Renewal
- Pre-fills custom prompt textarea
- Deselectable (click again to clear)

### Date Timezone Fix ✅
- All dates append 'Z' before parsing to force UTC interpretation
- Displays in user's local timezone via toLocaleString(undefined, {...})

### Codebase Audits ✅
- Round 1: Fixed parse_error check, briefStore URL, theme desync, feedback hydration, error nav, drawer animation
- Round 2: Fixed stale logout data, dead localStorage write, parse_error nested check

---

## 13. Features Partially Built / In Progress

### Company News Alerts (Feature 2) — Backend scaffolded
Route `/api/watchlist/alerts` added. Frontend red dot UI — check DashboardPage.jsx.

### CRM Notes (Feature 3) — Backend scaffolded  
WatchlistNote model + routes added. Frontend inline note UI — check DashboardPage.jsx.

### PDF Export (Feature 1) — Frontend complete
jsPDF + html2canvas installed. Export PDF button in BriefDisplayPage navbar.

---

## 14. Features NOT Yet Built

- Meeting time + email reminder (Feature 5)
- What changed since last time diff (Feature 6)  
- Competitor comparison brief (Feature 7)
- Real financial data (Alpha Vantage)
- JWT token refresh
- Brief caching
- Pro tier payment (Razorpay/Stripe)
- Team workspaces
- CRM integration
