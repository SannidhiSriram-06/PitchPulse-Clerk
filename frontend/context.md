# PitchPulse — Project Context

> **Last updated:** Phase 4 complete (2026-05-03)
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
financial overview, social sentiment, talking points, and risks/watch-outs.

**Primary user:** B2B sales reps who need 60-second context before walking into a meeting.

---

## 2. Full Folder Structure

```
PitchPulse/
├── context.md               ← This file. Full project state documentation.
├── backend/
│   ├── app.py               ← Flask app, all API routes (auth + brief + watchlist + prefs)
│   ├── auth.py              ← JWT helpers, bcrypt wrappers, require_auth decorator, input validators
│   ├── agents.py            ← 3 CrewAI agents, their tasks, and run_brief() orchestrator
│   ├── tools.py             ← Tavily search tool + realistic financial data stub
│   ├── models.py            ← SQLAlchemy ORM models: User, Brief, Watchlist tables
│   ├── database.py          ← SQLAlchemy db instance, init_db() with postgres:// fix
│   ├── config.py            ← Loads .env via dotenv, exposes Config class with all settings
│   ├── requirements.txt     ← Python dependencies (includes gunicorn)
│   ├── render.yaml          ← Render Blueprint config for backend deployment
│   ├── .env                 ← Local secrets (NOT committed to Git)
│   ├── .env.example         ← Template showing required env var names, safe to commit
│   └── venv/                ← Python virtual environment (NOT committed to Git)
└── frontend/                ← Vite + React + Tailwind frontend (built by Cursor)
    ├── vercel.json          ← Vercel SPA routing config (rewrites all to /)
    ├── public/
    │   └── favicon.svg      ← Acid yellow "P" lettermark on black background
    ├── src/
    │   ├── components/      ← Reusable UI: ProtectedRoute, WatchlistSidebar,
    │   │                       CustomizePanel, Skeletons, RateLimitModal
    │   ├── hooks/           ← Custom React hooks (useIsMobile)
    │   ├── lib/             ← Utility functions and axios instance (api.js)
    │   ├── pages/           ← Page components (Landing, Dashboard, BriefDisplay, etc.)
    │   └── store/           ← Zustand stores (authStore, briefStore, prefsStore)
```

---

## 3. Environment Variables

All loaded via `python-dotenv` from `backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | API key for Groq LLM inference. Get from console.groq.com |
| `TAVILY_API_KEY` | ✅ Yes | API key for Tavily web search. Get from app.tavily.com |
| `SECRET_KEY` | ✅ Yes | Flask session secret. Set to a long random string in prod |
| `JWT_SECRET_KEY` | ✅ Yes | Secret used to sign and verify JWT tokens. Generate with `python -c "import secrets; print(secrets.token_hex(64))"` |
| `JWT_EXPIRY_HOURS` | Optional | How long JWT tokens are valid (default: 24 hours) |
| `DATABASE_URL` | Optional | SQLAlchemy DB connection string. Defaults to `sqlite:///pitchpulse.db` |
| `CREWAI_TRACING_ENABLED` | Optional | Set to `false` to suppress CrewAI trace prompt on every run |
| `FRONTEND_URL` | Optional | Allowed CORS origin in prod. Defaults to `*` in dev |

Frontend env vars in `frontend/.env`:

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Optional | Backend URL. Defaults to `http://localhost:5001` if not set |

---

## 4. API Routes

### Auth Flow

Tokens go in the `Authorization` header as `Bearer <token>` on all protected routes.
A missing or expired token returns `401` with `"Please login to continue"` or `"Session expired, please login again"`.

---

### `GET /api/health`
No auth required.
**Response:** `{ "status": "ok" }`

---

### `POST /api/auth/register`
**Request:** `{ "email": "user@example.com", "password": "mypassword" }`  
**Success (201):** `{ "message": "Account created", "token": "eyJ..." }`  
**Errors:** 409 if email exists, 400 if validation fails

---

### `POST /api/auth/login`
**Request:** `{ "email": "...", "password": "..." }`  
**Success (200):**
```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "tier": "free",
    "briefs_used_this_hour": 0,
    "briefs_remaining_this_hour": 3,
    "created_at": "2026-05-01T..."
  }
}
```
**Failure (401):** `{ "error": "Invalid email or password." }`

---

### `GET /api/auth/me` 🔒
Returns same shape as `user` object in login response.

---

### `POST /api/auth/change-password` 🔒
**Request:** `{ "current_password": "...", "new_password": "..." }`  
**Success (200):** `{ "message": "Password updated successfully." }`

---

### `DELETE /api/auth/account` 🔒
Deletes user and all associated briefs/watchlist (cascade).  
**Success (200):** `{ "message": "Account deleted." }`

---

### `GET /api/user/preferences` 🔒
Returns the user's saved preferences JSON.  
**Success (200):** `{ "preferences": { "theme": "dark", "default_view": "tabs", ... } }`  
**Note:** Returns empty object `{}` if no preferences saved yet.

---

### `PATCH /api/user/preferences` 🔒
Merges incoming fields into existing preferences (does not overwrite unsent fields).  
**Request:** `{ "default_length": "medium", "default_view": "tabs", "show_watchlist": true, "show_sources": true, "theme": "dark" }`  
**Success (200):** `{ "message": "Preferences updated.", "preferences": { ... } }`  
**Note:** Stored as JSON string in `preferences` column on User model.

---

### `POST /api/brief` 🔒
Rate limited: free tier = 3 briefs/hour. Pro = unlimited.

**Request:**
```json
{
  "company_name": "Infosys",
  "length": "medium",
  "sections": ["summary", "news", "financials", "social_sentiment", "talking_points", "watch_out_for"]
}
```

**Success (200):**
```json
{
  "brief": { ... },
  "sources_used": ["https://..."],
  "generation_time_ms": 18075,
  "limited_data": false,
  "brief_id": 1,
  "briefs_remaining_this_hour": 2
}
```

**Errors:**
- 400: company not found / too vague
- 429: rate limit hit (`{ "error": "...", "reset_in_minutes": 45 }`)
- 500: agent failure

---

### `GET /api/briefs` 🔒
Returns `{ "briefs": [...] }` sorted by `created_at` desc.  
**IMPORTANT:** Response is `{ briefs: [] }` NOT a plain array. Frontend accesses `response.data.briefs`.  
Query params: `?search=infosys&saved=true`

Each brief object in the list has a `brief` field (already parsed object, NOT `brief_json` string).  
The card preview in DashboardPage uses `brief.brief?.summary?.content` (not `brief.brief_json`).

---

### `GET /api/briefs/:id` 🔒
Returns single brief by ID. Used by BriefDisplayPage.

---

### `PATCH /api/briefs/:id/save` 🔒
Toggles `saved` boolean on brief.

---

### `DELETE /api/briefs/:id` 🔒
Deletes a brief.

---

### `POST /api/briefs/:id/feedback` 🔒
**Request:** `{ "section": "news", "rating": "up" or "down" }`  
Stored in `feedback_summary` JSON field on Brief.

---

### `POST /api/briefs/:id/share` 🔒
Generates or returns existing `share_token`.  
**Success:** `{ "share_url": "http://localhost:5173/brief/share/abc123" }`

---

### `GET /api/share/:share_token` (public)
Returns brief JSON for read-only display. No auth required.  
Used by BriefDisplayPage in share/read-only mode.

---

### `GET /api/watchlist` 🔒
Returns user's pinned companies.

### `POST /api/watchlist` 🔒
**Request:** `{ "company_name": "Infosys" }`

### `DELETE /api/watchlist/:id` 🔒
Removes a watchlist entry.

---

## 5. Data Models

### `users` table

| Field | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `email` | String(255) | Unique |
| `password_hash` | String(255) | bcrypt 12 rounds |
| `tier` | String(50) | `"free"` or `"pro"` |
| `briefs_used_this_hour` | Integer | Resets based on `rate_limit_reset_at` |
| `rate_limit_reset_at` | DateTime | When the hourly window resets |
| `preferences` | Text | JSON string. Added in Phase 4. Nullable. |
| `created_at` | DateTime | |

### `briefs` table

| Field | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `user_id` | Integer (FK → users.id, CASCADE) | |
| `company_name` | String(255) | |
| `brief_json` | Text | Full brief stored as JSON string in DB |
| `length` | String(50) | short / medium / long |
| `saved` | Boolean | Default False |
| `share_token` | String(64) | Nullable, generated on first share |
| `feedback_summary` | Text | JSON string of per-section ratings |
| `sources_used` | Text | JSON array of source URLs |
| `generation_time_ms` | Integer | |
| `created_at` | DateTime | |

### `watchlist` table

| Field | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `user_id` | Integer (FK → users.id, CASCADE) | |
| `company_name` | String(255) | |
| `added_at` | DateTime | |
| `last_briefed_at` | DateTime | Nullable |

---

## 6. Auth Architecture

- **Method:** Email + password. No OAuth.
- **Hashing:** bcrypt with 12 rounds
- **Token format:** JWT signed with HS256 using `JWT_SECRET_KEY`
- **Token payload:** `{ sub: user_id, iat: issued_at, exp: expiry }`
- **Token expiry:** 24 hours (configurable via `JWT_EXPIRY_HOURS`)
- **Token location:** `Authorization: Bearer <token>` header
- **Frontend storage:** Token stored in `localStorage` under key `token` (NOT inside a Zustand persist wrapper — it's a plain localStorage key)
- **Protected route decorator:** `@require_auth` in `auth.py` — sets `g.current_user`
- **401 messages:**
  - Missing token → `"Please login to continue"`
  - Expired token → `"Session expired, please login again"`
  - User deleted → `"Please login to continue"`

---

## 7. Agent Descriptions

### Agent 1 — Company Intelligence Researcher

| Property | Value |
|---|---|
| **Role** | Company Intelligence Researcher |
| **LLM** | Groq via LiteLLM — `groq/meta-llama/llama-4-scout-17b-16e-instruct` |
| **Tools** | `company_web_search` (Tavily), `company_financial_data` (stub) |
| **Max iterations** | 4 |
| **verbose** | False (set in Phase 4) |
| **Output** | Research summary with source URLs and `total_results_found` |

### Agent 2 — Strategic Business Analyst

| Property | Value |
|---|---|
| **Role** | Strategic Business Analyst |
| **LLM** | Groq via LiteLLM — `groq/meta-llama/llama-4-scout-17b-16e-instruct` |
| **Tools** | None (reasoning only) |
| **Max iterations** | 3 |
| **verbose** | False (set in Phase 4) |
| **Output** | Talking points, watch-out items, pain points, strategic shifts |

### Agent 3 — Pre-Meeting Brief Specialist

| Property | Value |
|---|---|
| **Role** | Pre-Meeting Brief Specialist |
| **LLM** | Groq via LiteLLM — `groq/meta-llama/llama-4-scout-17b-16e-instruct` |
| **Tools** | None |
| **Max iterations** | 2 |
| **verbose** | False (set in Phase 4) |
| **Output** | Valid JSON with sections: summary, news, financials, social_sentiment, talking_points, watch_out_for. Each has `content`, `confidence` (high/medium/low), `sources` array. |

### CrewAI Process
- `Process.sequential` — Research → Analysis → Briefing
- Typical generation time: 15–30s for `short`, 30–90s for `medium`/`long`

---

## 8. Design System

### Colors
**Dark mode (default):**
- Background: `#0A0A0A` (actual render may appear slightly lighter, ~`#111` — Cursor default)
- Surface/cards: `#111111`
- Border: `#222222`
- Primary text: `#FFFFFF`
- Secondary text: `#888888`
- Accent: `#C8FF00` (acid yellow) — used for CTAs, highlights, active states in dark mode

**Light mode:**
- Background: `#F5F5F0`
- Surface: `#FFFFFF`
- Border: `#E5E5E5`
- Primary text: `#1A1A1A`
- Secondary text: `#666666`
- Accent: `#2563EB` (blue) — NOTE: light mode uses BLUE not acid yellow for buttons/CTAs
- Acid yellow on white is too harsh — this was intentional

**Font:** Space Grotesk (via `@fontsource/space-grotesk`)

**Theme toggle:** Sun/moon icon in navbar. Preference stored in `prefsStore` with localStorage
persistence via Zustand `persist` middleware (key: `pitchpulse-prefs`).

**Favicon:** Acid yellow "P" lettermark SVG on black background (`frontend/public/favicon.svg`)

---

## 9. What Was Completed

### Phase 1 ✅
- Full backend scaffold, config, DB, models, tools, agents, Flask routes
- `/api/health` and `/api/brief` working
- Rate limiting logic (3/hour free tier)
- End-to-end test passed: Infosys brief in ~18 seconds with real Tavily data

### Phase 2 ✅
- Auth: register, login, me, change-password, delete account
- JWT + bcrypt, `@require_auth` decorator
- Brief management: list, get, save toggle, delete, feedback, share token, public share
- Watchlist: get, add, remove
- `/api/brief` now requires auth, saves to DB, enforces rate limiting per user
- Cascade deletes on user removal
- Input sanitization on company_name

### Phase 3 ✅
- Vite + React + Tailwind frontend (built by Cursor, not Stitch)
- Space Grotesk font, dark/light mode with theme toggle
- PWA configured (manifest, vite-plugin-pwa, install prompt after 30s)
- Pages: Landing, Auth, Onboarding, Dashboard, BriefGenerator, BriefDisplay, History, Settings
- Zustand stores: authStore, briefStore, prefsStore
- axios instance with JWT interceptor and 401 redirect
- Brief display: tabs + cards view, confidence badges, thumbs feedback, sources panel, save/share
- Mobile responsive with useIsMobile hook, sidebar collapses on mobile
- Watchlist sidebar with last briefed timestamp ("Xh ago", "Never briefed")
- Backend fix: added `GET /api/briefs/:id` and `POST` method on share route

**Confirmed working:** Register → login → generate brief (Infosys, Sarvam AI tested) → view in dashboard

### Phase 4 ✅ (2026-05-03)
- **Brief card preview fixed:** API returns `brief` field (parsed object), not `brief_json` (string). DashboardPage now uses `brief.brief?.summary?.content` for preview snippet, truncated to 120 chars.
- **`GET` + `PATCH /api/user/preferences`:** Both methods implemented. GET returns saved prefs, PATCH merges updates. `preferences` column added to User model (Text, JSON string).
- **prefsStore persistence:** Zustand `persist` middleware added with key `pitchpulse-prefs`. Prefs hydrated from backend on dashboard load via `loadPrefs()`.
- **CustomizePanel component:** Slide-in right panel (gear ⚙ icon in navbar) with theme toggle, default view selector, show/hide watchlist and sources toggles. Syncs to backend on Save & Close.
- **Loading skeletons:** `BriefCardSkeleton` and `WatchlistItemSkeleton` components in `Skeletons.jsx`. Applied to DashboardPage, HistoryPage, WatchlistSidebar.
- **Empty states:** Dashboard ("No briefs yet. Generate your first brief"), History ("No briefs match your search"), Watchlist ("No companies pinned yet").
- **Rate limit modal:** `RateLimitModal.jsx` — shows on 429 response with reset time and upgrade prompt. Escape key + button to close.
- **Realistic financial stub:** `company_financial_data` in tools.py now returns varied realistic numbers seeded by company name hash.
- **Share page banner:** Acid yellow "Generated with PitchPulse / Get your free account →" banner on public share view. Save/Regenerate/feedback hidden in read-only mode.
- **Production prep:** `verbose=False` on all 3 agents, CORS uses `FRONTEND_URL` env var, `database.py` handles `postgres://` → `postgresql://` URL fix, `gunicorn` added to requirements.txt.
- **Deployment files:** `backend/render.yaml` and `frontend/vercel.json` created.
- **Meta tags + favicon:** Title, description, OG tags, theme-color, favicon.svg all set in `index.html`.
- **Mobile layout:** Bottom navigation bar (Home/New Brief/History/Settings) on mobile. Watchlist sidebar hidden on mobile.

**Confirmed working:** Brief cards show real preview text, customize panel persists across refresh, share page shows viral banner, favicon visible in browser tab.

---

## 10. What Is NOT Yet Built

- **Real financial data:** `company_financial_data` in `tools.py` returns a realistic-looking stub seeded by company name. Wire Alpha Vantage or similar for real data in future.
- **Deployment:** Render (backend) + Vercel (frontend) — Phase 5
- **Email verification:** Not implemented
- **Password reset / forgot password:** Not implemented (show "Coming Soon" in UI)
- **Token refresh:** No refresh mechanism, user re-logs in after 24h expiry
- **Brief caching:** Every generation re-runs all 3 agents from scratch
- **Watchlist bottom sheet on mobile:** Currently hidden on mobile. Phase 4 prompt specified a slide-up bottom sheet — not fully implemented, watchlist is just hidden on mobile instead.
- **Pro tier:** Rate limit UI exists but no actual upgrade path

---

## 11. Decisions Made and Why

| Decision | Choice | Reason |
|---|---|---|
| LLM | Groq `llama-4-scout-17b-16e-instruct` | Fast inference, 30K TPM free tier |
| LLM wrapper | `crewai.LLM` with `groq/` prefix via LiteLLM | CrewAI 1.x dropped native langchain-groq support |
| Agent framework | CrewAI 1.14.4 | Multi-agent sequential pipelines, pinned version |
| Search | Tavily | Best structured output for AI agent search |
| Database (dev) | SQLite — stored in `backend/instance/pitchpulse.db` | Zero setup. Note: Flask puts it in `instance/` folder |
| Database (prod) | PostgreSQL on Render (planned) | Render free tier |
| Backend | Flask 3.0.3 | Lightweight |
| Port | 5001 | Port 5000 hijacked by macOS AirPlay on Monterey+ |
| Frontend tooling | Cursor (not Stitch) | Cursor's default output was clean enough |
| Light mode accent | Blue (`#2563EB`) not acid yellow | Acid yellow on white is too harsh visually |
| Auth | Email + password, no OAuth | Simpler, no OAuth provider setup needed |
| Password hashing | bcrypt 12 rounds | Industry standard |
| Token | JWT HS256 | Stateless |
| Token storage | Plain `localStorage.token` key | NOT inside Zustand persist — raw key |
| CORS | `origins=os.getenv("FRONTEND_URL", "*")` | `*` in dev, lock to Vercel URL in prod |
| Input sanitization | Regex on company_name | Prevents agent prompt injection |
| Prefs storage | Zustand persist + backend sync | localStorage for instant load, backend for cross-device |
| gunicorn timeout | 120s | CrewAI generation can take 30–90s. Default 30s timeout kills requests. |

---

## 12. Known Issues / Watch Out For

1. **macOS AirPlay on port 5000:** Flask runs on 5001. Don't change it.
2. **LiteLLM must be in venv:** Always `source venv/bin/activate` first.
3. **Circular import in database.py:** `import models` must stay inside `init_db()` body.
4. **JSON parse fallback:** Briefing agent sometimes wraps output in markdown fences. `_extract_json()` in `agents.py` handles this.
5. **CrewAI tracing prompt:** Add `CREWAI_TRACING_ENABLED=false` to `.env`.
6. **Groq TPM limits:** Wait 30s and retry on 500 with Groq rate limit detail.
7. **CrewAI version:** Pinned to `crewai==1.14.4`. Don't upgrade without testing.
8. **SQLite concurrency:** Fine for dev. Migrate to PostgreSQL before prod.
9. **Schema changes:** SQLAlchemy won't auto-migrate. Delete `backend/instance/pitchpulse.db` and restart backend to apply model changes.
10. **JWT_SECRET_KEY:** Must be set in prod or tokens are insecure.
11. **Rate limit reset in dev:** Temporarily change `timedelta(hours=1)` to `timedelta(seconds=10)` in `_check_and_increment_rate_limit` to test reset behavior.
12. **SQLite location:** Flask stores DB at `backend/instance/pitchpulse.db` (not `backend/pitchpulse.db`). Use `find . -name "*.db"` if unsure.
13. **`/api/briefs` response shape:** Returns `{ briefs: [] }` not a plain array. Frontend uses `response.data.briefs`. Brief objects have a `brief` field (parsed object) not `brief_json`.
14. **prefsStore hydration:** Prefs load from localStorage instantly on mount (Zustand persist), then GET /api/user/preferences overwrites with server state on dashboard load.

---

## 13. Frontend Routes

| Path | Component | Auth Required |
|---|---|---|
| `/` | LandingPage | No |
| `/login` | AuthPage | No |
| `/register` | AuthPage | No |
| `/onboarding` | OnboardingPage | Yes |
| `/dashboard` | DashboardPage | Yes |
| `/brief/new` | BriefGeneratorPage | Yes |
| `/brief/:id` | BriefDisplayPage | Yes |
| `/brief/share/:token` | BriefDisplayPage (read-only, share banner shown) | No |
| `/history` | HistoryPage | Yes |
| `/settings` | SettingsPage | Yes |

---

## 14. Deployment Plan (Phase 5)

- **Backend:** Render (free tier, Python web service + free PostgreSQL)
- **Frontend:** Vercel (free tier, React/Vite)
- **CORS:** Set `FRONTEND_URL` env var in Render to Vercel production URL
- **DATABASE_URL:** Render gives `postgres://` — `database.py` already handles the `postgresql://` fix
- **gunicorn:** Already in requirements.txt. Start command: `gunicorn app:app --timeout 120`
- **Environment variables:** Set all backend vars in Render dashboard, `VITE_API_URL` in Vercel dashboard
- **React Router:** `vercel.json` already created with SPA rewrite rule

---

## 15. Deployment Readiness Checklist

- [x] `verbose=False` on all 3 agents
- [x] CORS uses `FRONTEND_URL` env var (defaults to `*` in dev)
- [x] `database.py` handles `postgres://` → `postgresql://` URL fix
- [x] `gunicorn` in requirements.txt
- [x] `backend/render.yaml` present with 120s timeout
- [x] `frontend/vercel.json` present with SPA rewrite
- [x] `.gitignore` should cover: `backend/.env`, `backend/venv/`, `backend/instance/*.db`, `backend/__pycache__/`, `frontend/node_modules/`, `frontend/.env`, `frontend/dist/`
- [x] All env vars documented in `backend/.env.example` and `frontend/.env.example`
- [x] Brief card preview working
- [x] Rate limit modal working
- [x] Share page banner working
- [x] Mobile layout tested (bottom nav bar present)
- [ ] Provision API keys (GROQ_API_KEY, TAVILY_API_KEY, JWT_SECRET_KEY, SECRET_KEY) in Render
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Set FRONTEND_URL in Render to Vercel URL after frontend deploy
- [ ] Set VITE_API_URL in Vercel to Render URL after backend deploy
- [ ] Test end-to-end on production URLs
