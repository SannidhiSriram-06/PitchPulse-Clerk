# PitchPulse — Phase 4 Context File
Paste this entire file into a new chat to bring Claude fully up to speed on Phase 4 completion.

---

## What Phase 4 Was

Phase 4 was a polish + production-prep sprint covering 10 tasks before deployment. All 10 are now complete.

---

## Project Overview

**PitchPulse** is a full-stack AI-powered pre-meeting sales brief generator built for the BITSoM Product Management with Agentic AI Cohort 2 final project (PS4). It uses a 3-agent CrewAI pipeline (Researcher → Analyst → Formatter) to generate structured, sourced company briefs in 15–90 seconds.

---

## Live Local Dev URLs (Phase 4)

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5001
- **Not yet deployed** — deployment is Phase 5

---

## Local Project Path

```
/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/
├── backend/
│   ├── app.py           # Flask app, all routes, factory pattern via create_app()
│   ├── agents.py        # CrewAI agents (all verbose=False now)
│   ├── tools.py         # Tavily search + deterministic financial data stub
│   ├── models.py        # SQLAlchemy models
│   ├── database.py      # DB init with postgres:// → postgresql:// fix
│   ├── auth.py          # JWT auth, require_auth decorator
│   ├── config.py        # Config from env vars
│   ├── requirements.txt # Includes gunicorn
│   └── render.yaml      # Render Blueprint deploy config
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── DashboardPage.jsx     # Main app view (gear sidebar, skeletons, mobile nav)
    │   │   ├── BriefDisplayPage.jsx  # Brief viewer (share banner, gear sidebar)
    │   │   ├── BriefGeneratorPage.jsx # Brief creation (rate limit modal wired)
    │   │   ├── HistoryPage.jsx       # Brief history (skeletons, empty state)
    │   │   ├── SettingsPage.jsx
    │   │   ├── AuthPage.jsx
    │   │   ├── OnboardingPage.jsx
    │   │   └── LandingPage.jsx
    │   ├── components/
    │   │   ├── CustomizePanel.jsx    # NEW — gear sidebar, syncs prefs to backend
    │   │   ├── RateLimitModal.jsx    # NEW — 429 modal with reset timer
    │   │   ├── Skeletons.jsx         # NEW — BriefCardSkeleton, WatchlistItemSkeleton
    │   │   ├── WatchlistSidebar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── store/
    │   │   ├── prefsStore.js         # UPDATED — persist middleware + loadPrefs action
    │   │   ├── authStore.js
    │   │   ├── briefStore.js
    │   │   └── themeStore.js
    │   ├── hooks/
    │   │   └── useIsMobile.js
    │   └── lib/api.js
    ├── public/
    │   ├── favicon.svg               # NEW — dark bg with acid yellow "P"
    │   └── icons.svg
    ├── index.html                    # UPDATED — meta tags, OG tags, favicon link
    ├── vite.config.js
    ├── vercel.json                   # NEW — SPA rewrites config
    └── .env.example                  # UPDATED — VITE_API_URL placeholder
```

---

## Tech Stack

### Backend
- **Python 3.11.9** (local) — `.python-version` file in backend/
- **Flask 3.0.3** with factory pattern (`create_app()` in app.py)
- **CrewAI 1.14.4** — all 3 agents set to `verbose=False`
- **Groq** (via LiteLLM) — LLM inference
- **Tavily Python 0.5.0** — real-time web search
- **Financial data** — deterministic stub (hash-based, no real API yet)
- **SQLite** locally — stored at `backend/instance/pitchpulse.db`
- **JWT (PyJWT)** + **bcrypt** for auth
- **gunicorn** — added to requirements.txt for production

### Frontend
- **React 18** + **Vite 8**
- **Tailwind CSS v4** (via @tailwindcss/vite)
- **Zustand** with persist middleware — stores: authStore, briefStore, prefsStore (persisted to `pitchpulse-prefs` in localStorage), themeStore

---

## Database Models

### User
- id, email, password_hash, created_at
- **preferences** (Text, nullable) — JSON string, added in Phase 4
- brief_count, hour_window_start (rate limiting)
- tier ('free' | 'pro')

### Brief
- id, user_id (FK), company_name, length
- **brief_json** — stores full JSON output as a string
- **API response returns it as `brief` (already parsed dict), NOT `brief_json`**
- sources_used, limited_data, saved (bool), share_token, created_at

### Watchlist
- id, user_id (FK), company_name, last_briefed_at, added_at

---

## Critical API Response Shape (Fixed in Phase 4)

The `/api/briefs` list endpoint returns:
```json
{ "briefs": [ { "id": 1, "company_name": "...", "brief": {...}, "length": "...", ... } ] }
```

**Key gotcha:** The field is `brief` (already parsed object), NOT `brief_json` (string). Frontend uses `brief.brief` not `JSON.parse(brief.brief_json)`. This was the bug discovered and fixed in Phase 4 Task 1.

The `/api/brief/:id` single brief endpoint also returns `brief` as a parsed object.

---

## Authentication

- JWT token stored in **plain `localStorage.token`** — NOT inside Zustand store, NOT inside `auth-storage`
- Token format: `Bearer <JWT>` in Authorization header
- `require_auth` decorator in auth.py validates token and sets `g.current_user`

---

## All Backend API Routes (Phase 4 complete state)

**Auth:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `DELETE /api/auth/account`

**User:**
- `GET /api/user/preferences` — returns `{ preferences: {...} }` — added GET in Phase 4
- `PATCH /api/user/preferences` — accepts `{ theme, default_view, show_watchlist, show_sources, default_length }` — added in Phase 4
  - Allowed keys: `default_length`, `default_view`, `show_watchlist`, `show_sources`, `theme`
  - Merges into existing preferences JSON, saves to User.preferences column

**Brief:**
- `POST /api/brief` — generate brief, rate-limited (3/hr free tier), returns `{ brief: {...}, sources_used: [...], limited_data: bool }`
- `GET /api/briefs` — list user's briefs, returns `{ briefs: [...] }`
- `GET /api/briefs/<id>` — single brief
- `DELETE /api/briefs/<id>`
- `PATCH /api/briefs/<id>/save` — toggle saved
- `GET /api/briefs/<id>/share` — get or generate share token
- `GET /api/share/<share_token>` — **PUBLIC, no auth** — view shared brief

**Watchlist:**
- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist/<id>`

**Health:**
- `GET /api/health` — returns `{"status": "ok"}`

---

## Rate Limiting

- 3 briefs per hour on free tier
- Stored in User model: `brief_count` + `hour_window_start` (window resets after 1hr)
- On limit hit: returns HTTP 429 with `{ "error": "...", "reset_in_minutes": N }`
- Frontend: `RateLimitModal` catches 429 in `BriefGeneratorPage.jsx`, shows modal with reset timer

---

## New Components (Phase 4)

### CustomizePanel.jsx
- Slide-in panel from right, 280px wide
- No outside-click-to-close (removed in Phase 4 — was resetting prefs before save)
- Has ✕ button and "Save & Close" button
- Controls: Theme (dark/light), Default View (tabs/cards), Show Watchlist (checkbox), Show Sources (checkbox)
- Each toggle calls `api.patch('/api/user/preferences', {...})` immediately
- Uses `usePrefsStore` for state

### RateLimitModal.jsx
- Fixed overlay modal (closes on Escape or clicking "Got it")
- Props: `resetInMinutes`, `onClose`
- Shows reset countdown if `resetInMinutes` is provided

### Skeletons.jsx
- `BriefCardSkeleton` — matches brief card dimensions, 4 pulsing lines
- `WatchlistItemSkeleton` — compact, 2 pulsing lines
- Uses `var(--border)` for skeleton background (theme-aware)

---

## PrefsStore (Updated in Phase 4)

```js
// src/store/prefsStore.js
// Wrapped with Zustand persist middleware
// localStorage key: 'pitchpulse-prefs'

Fields:
- theme: 'dark'           // 'dark' | 'light'
- defaultView: 'tabs'     // 'tabs' | 'cards'
- showWatchlist: true     // bool
- showSources: true       // bool

Actions:
- setTheme(val)
- setDefaultView(val)
- setShowWatchlist(val)
- setShowSources(val)
- loadPrefs(prefsObj)     // merges backend prefs into store — called on dashboard load
```

Prefs hydration flow: `DashboardPage` → on mount → `api.get('/api/user/preferences')` → `loadPrefs(data.preferences)` — silent fail if unauthenticated.

---

## Share Page (Task 8)

- Route: `/brief/share/:token`
- Rendered by `BriefDisplayPage.jsx` with `isShareView = true` (detected from URL params)
- When `isShareView`:
  - Shows yellow banner at top: "Generated with PitchPulse — Get your free account →"
  - Hides: Save button, Regenerate button, feedback thumbs
  - Shows: brief content, sources (read-only)

---

## Mobile Layout (Task 4)

- `useIsMobile` hook imported in `DashboardPage.jsx`
- On mobile: watchlist sidebar hidden, full-width main content
- Fixed bottom nav bar on mobile: 🏠 Home | ⚡ New Brief | 🕐 History | ⚙ Settings
- Note: Mobile watchlist interaction is partially implemented — sidebar hides on mobile but there's no mobile drawer/sheet for watchlist yet (known gap)

---

## Favicon + Meta Tags (Task 10)

- `frontend/public/favicon.svg` — dark `#0A0A0A` background, acid yellow `#C8FF00` "P"
- `index.html` title: "PitchPulse — Know your prospect"
- OG tags: title "PitchPulse", description "Know your prospect before you walk in the door."
- Meta description: "AI-powered pre-meeting intelligence for sales professionals. Get a full company brief in 30 seconds."
- theme-color: `#C8FF00`

---

## Production Prep Files (Task 9)

### backend/render.yaml
```yaml
services:
  - type: web
    name: pitchpulse-api
    runtime: python
    plan: free
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn "app:create_app()" --timeout 120
    envVars:
      - key: GROQ_API_KEY
        sync: false
      - key: TAVILY_API_KEY
        sync: false
      - key: SECRET_KEY
        sync: false
      - key: JWT_SECRET_KEY
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: pitchpulse-db
          property: connectionString
      - key: FRONTEND_URL
        sync: false
      - key: CREWAI_TRACING_ENABLED
        value: "false"
databases:
  - name: pitchpulse-db
    plan: free
```

**Note:** `rootDir: backend` and `plan: free` were critical — both added during Phase 5 deployment troubleshooting.

### frontend/vercel.json
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

### backend/database.py
Has postgres:// → postgresql:// URL fix at start of `init_db()` (Heroku/Render legacy URL compat).

### backend/app.py CORS
```python
CORS(app, origins=os.getenv("FRONTEND_URL", "*"))
```

---

## Financial Data Stub (Task 7)

`company_financial_data` tool in `tools.py` uses a hash of the company name to deterministically return fake-but-plausible financial data:
- stock_price, price_change_24h, market_cap, revenue_ttm, revenue_growth_yoy, recent_earnings, employee_count
- `data_source: "Estimated (financial API not connected)"`
- Same company always gets same numbers (seed = `sum(ord(c) for c in name.lower())`)

---

## Loading Skeletons (Task 5)

Applied in:
- `DashboardPage.jsx` — 4x `BriefCardSkeleton` while briefs load; "No briefs yet" empty state with "+ Generate Brief" CTA
- `HistoryPage.jsx` — 4x `BriefCardSkeleton` + "No briefs match your search" empty state
- `DashboardPage.jsx` watchlist sidebar — 3x `WatchlistItemSkeleton` + "No companies pinned yet" empty state

---

## Environment Variables (Local .env)

```
GROQ_API_KEY=...
TAVILY_API_KEY=...
SECRET_KEY=...
JWT_SECRET_KEY=...
DATABASE_URL=sqlite:///pitchpulse.db  (local — auto-set by Flask instance folder)
CREWAI_TRACING_ENABLED=false
FRONTEND_URL=http://localhost:5173    (optional locally)
```

Frontend:
```
VITE_API_URL=http://localhost:5001
```

---

## Local Dev Setup

```bash
# Backend (Tab 1)
cd "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/backend"
source venv/bin/activate     # Python 3.11.9 venv
python app.py                # runs on :5001

# Frontend (Tab 2)
cd "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/frontend"
npm run dev                  # runs on :5173
```

If SQLite DB needs to be reset (new columns added etc):
```bash
rm "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/backend/instance/pitchpulse.db"
# then restart backend — db.create_all() recreates it
```

---

## Phase 4 Task Checklist (All Done)

| Task | Description | Status |
|------|-------------|--------|
| 1 | Brief card preview — fixed `brief.brief` vs `JSON.parse(brief.brief_json)` | ✅ |
| 2 | `PATCH /api/user/preferences` route + `preferences` column on User | ✅ |
| 3 | Customize gear sidebar (`CustomizePanel.jsx`) on Dashboard + BriefDisplay | ✅ |
| 4 | Mobile layout — bottom nav bar, hide sidebar on mobile | ✅ |
| 5 | Loading skeletons (`Skeletons.jsx`) on Dashboard, History, Watchlist | ✅ |
| 6 | Rate limit modal (`RateLimitModal.jsx`) wired to 429 in BriefGeneratorPage | ✅ |
| 7 | Deterministic financial data stub in `tools.py` | ✅ |
| 8 | Share page yellow "Generated with PitchPulse" banner | ✅ |
| 9 | Production prep — CORS, postgres URL fix, gunicorn, render.yaml, vercel.json | ✅ |
| 10 | Meta tags, OG tags, favicon.svg | ✅ |

---

## What Phase 5 Is (Deployment)

Phase 5 = deploy to production. Steps:
1. Push repo to GitHub (`SannidhiSriram-06/PitchPulse`)
2. Deploy backend to Render using Blueprint (reads `backend/render.yaml`)
3. Deploy frontend to Vercel (root dir: `frontend`, framework: Vite)
4. Set all env vars on both platforms
5. Update `FRONTEND_URL` on Render to Vercel URL
6. Update `VITE_API_URL` on Vercel to Render URL
7. Test end-to-end

---

*Last updated: Phase 4 complete. All 10 tasks done. App is feature-complete and production-ready for Phase 5 deployment.*
