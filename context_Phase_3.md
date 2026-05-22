# PitchPulse — Phase 3 Context File
Paste this entire file into a new chat to bring Claude fully up to speed on Phase 3 completion.

---

## What Phase 3 Was

Phase 3 was building the entire React frontend from scratch. Backend (Phases 1 & 2) was already complete. This phase took the app from "working backend + no UI" to a fully functional product running locally.

---

## Project Overview

**PitchPulse** is a full-stack AI-powered pre-meeting sales brief generator built for the BITSoM Product Management with Agentic AI Cohort 2 final project (PS4). It uses a 3-agent CrewAI pipeline (Researcher → Analyst → Formatter) to generate structured, sourced company briefs in 15–90 seconds.

---

## Live Local Dev URLs (End of Phase 3)

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5001
- **Not yet deployed** — deployment is Phase 5

---

## Local Project Path

```
/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/
├── backend/           # Phase 1 & 2 — fully complete
│   ├── app.py
│   ├── agents.py      # verbose=False on all agents, max_iter=8 for Researcher
│   ├── tools.py       # Tavily web search, max_results=3
│   ├── models.py
│   ├── database.py
│   ├── auth.py
│   ├── config.py
│   └── requirements.txt
└── frontend/          # Phase 3 — fully complete
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── AuthPage.jsx
    │   │   ├── OnboardingPage.jsx
    │   │   ├── DashboardPage.jsx       # Has sidebar, watchlist, brief grid, mobile drawer
    │   │   ├── BriefGeneratorPage.jsx  # Has loading overlay, status messages, section toggles
    │   │   ├── BriefDisplayPage.jsx    # Has tabs/cards, confidence badges, feedback, sources
    │   │   ├── HistoryPage.jsx         # Has search, date filter, saved filter, delete
    │   │   └── SettingsPage.jsx        # Has change password, prefs, subscription, danger zone
    │   ├── components/
    │   │   └── ProtectedRoute.jsx
    │   ├── store/
    │   │   ├── authStore.js
    │   │   ├── briefStore.js
    │   │   ├── prefsStore.js
    │   │   └── themeStore.js           # Dark/light mode, persisted to localStorage
    │   ├── hooks/
    │   │   └── useIsMobile.js          # Listens for resize events, returns bool at <640px
    │   ├── lib/
    │   │   └── api.js                  # Axios instance with JWT interceptor + 401 redirect
    │   ├── App.jsx                     # Routes + PWA install prompt banner
    │   ├── main.jsx                    # BrowserRouter wrapper
    │   └── index.css                   # CSS variables for dark/light mode, Space Grotesk
    ├── public/
    │   └── (empty except defaults — favicon added in Phase 4)
    ├── index.html
    ├── vite.config.js                  # Vite + Tailwind + VitePWA
    └── .env                            # VITE_API_URL=http://localhost:5001
```

---

## Tech Stack (Frontend)

- **React 18** + **Vite 8**
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **Space Grotesk** font via `@fontsource/space-grotesk`
- **Zustand** — state management (4 stores)
- **React Router DOM** — client-side routing
- **Axios** — HTTP client with interceptors
- **vite-plugin-pwa** — PWA manifest + service worker (install prompt banner in App.jsx)
- **lucide-react** — icons
- Install command used: `npm install tailwindcss @tailwindcss/vite react-router-dom axios zustand vite-plugin-pwa lucide-react @fontsource/space-grotesk --legacy-peer-deps`
  - `--legacy-peer-deps` required because `vite-plugin-pwa@1.2.0` hasn't caught up to Vite 8

---

## Design System (CSS Variables)

Defined in `src/index.css` via `data-theme` attribute on `document.documentElement`:

```css
[data-theme="dark"] {
  --bg: #0A0A0A;
  --surface: #111111;
  --border: #222222;
  --text: #FFFFFF;
  --text-sec: #888888;
}

[data-theme="light"] {
  --bg: #F5F5F0;
  --surface: #FFFFFF;
  --border: #E5E5E5;
  --text: #1A1A1A;
  --text-sec: #666666;
}
```

Fixed colors (never change between themes):
- `#C8FF00` — acid yellow accent
- `#EF4444` — danger/red
- `#22C55E` — success/green
- `#3B82F6` — blue links

All inline styles in all pages use `var(--bg)`, `var(--surface)`, `var(--border)`, `var(--text)`, `var(--text-sec)` instead of hardcoded hex.

---

## Routing (App.jsx)

```
/                     → LandingPage
/login                → AuthPage
/register             → AuthPage
/onboarding           → ProtectedRoute(OnboardingPage)
/dashboard            → ProtectedRoute(DashboardPage)
/brief/new            → ProtectedRoute(BriefGeneratorPage)
/brief/:id            → ProtectedRoute(BriefDisplayPage)
/brief/share/:token   → BriefDisplayPage (NO auth wrapper — public)
/history              → ProtectedRoute(HistoryPage)
/settings             → ProtectedRoute(SettingsPage)
```

App.jsx also has the PWA install prompt banner at the bottom (fires after 30s, respects `pwa_dismissed` in localStorage).

---

## Zustand Stores

### authStore.js
```js
// Token + user from plain localStorage keys
token: localStorage.getItem('token') || null
user: JSON.parse(localStorage.getItem('user') || 'null')

// Actions: login(token, user), logout(), setUser(user)
// login() sets both state + localStorage
// logout() clears both state + localStorage
```

### briefStore.js
```js
// State: currentBrief, history, generating, statusMessage
// generateBrief(companyName, length, sections) — POSTs to /api/brief
// saveBrief(briefId) — PATCHes /api/brief/:id/save (NOTE: wrong path — fixed in Phase 4)
// setStatusMessage(msg), setCurrentBrief(brief), setHistory(history)
```

### prefsStore.js
```js
// State: defaultLength ('medium'), defaultView ('tabs')
// Stored in localStorage keys 'defaultLength', 'defaultView'
// setPrefs({ defaultLength, defaultView }) — updates both state + localStorage
// NOTE: Phase 4 added persist middleware and loadPrefs() from backend
```

### themeStore.js
```js
// State: theme ('dark' | 'light')
// toggleTheme() — swaps theme, saves to localStorage, sets data-theme on documentElement
// Init: reads from localStorage, applies to document on load
```

---

## api.js (src/lib/api.js)

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
})

// Request interceptor: auto-attaches Bearer token from localStorage.getItem('token')
// Response interceptor: on 401, clears localStorage + redirects to /login
```

**Token storage:** Plain `localStorage.token` — NOT inside Zustand, NOT `auth-storage`.

---

## useIsMobile Hook (src/hooks/useIsMobile.js)

Listens for `window.resize` events and returns `true` when `window.innerWidth < 640`. Reactive — updates when window resizes, unlike a one-time `window.innerWidth` check.

---

## Page Details

### LandingPage.jsx
- Dark background landing with nav (Log in + Get Started buttons)
- Hero: "Know your prospect / before you walk in / the door." with acid yellow highlight
- 4-feature grid: Live Research, Financial Signals, Talking Points, Watch Out For
- Footer: "PitchPulse — Built for B2B sales reps who prep."
- Mobile responsive: buttons stack vertically, hero font uses `clamp()`

### AuthPage.jsx
- Handles both `/login` and `/register` routes
- Toggle between modes (tab UI)
- On register: `POST /api/auth/register` → redirects to `/onboarding`
- On login: `POST /api/auth/login` → redirects to `/dashboard`
- Shows inline errors from backend
- Password min 8 chars validation on frontend

### OnboardingPage.jsx
- 3-step flow:
  - Step 1: Add watchlist companies (up to 5, posted to `/api/watchlist`)
  - Step 2: Set defaultLength + defaultView preferences
  - Step 3: Summary + "Go to Dashboard"
- Stores prefs in `prefsStore`, watchlist POSTed to backend
- Sets `localStorage.setItem('onboarded', 'true')` on finish

### DashboardPage.jsx
The most complex page. Key features:

**Layout:**
- Sticky top nav: logo, search input, "New Brief" button, user avatar menu
- Left sidebar (240px): watchlist + add company input
- Main area: brief cards grid

**Sidebar features:**
- Collapsible (toggle via ChevronLeft/Right button at sidebar top)
  - Open: 240px, shows company name, "Last briefed X ago", ⚡ brief button, X remove button
  - Collapsed: 48px, shows only icons + freshness dot
  - `sidebarOpen` state persisted in `localStorage('sidebar_open')`
  - Smooth width transition: `transition: 'width 0.2s ease'`
- **Last briefed timestamp:** reads `last_briefed_at` from watchlist API response
  - `formatLastBriefed()` helper: "just now" / "Xm ago" / "Xh ago" / "Xd ago" / "Jan 3"
  - Collapsed state: green dot (#22C55E) if briefed within 7 days, gray (#444) otherwise
- Add company: input + "+" button, posts to `/api/watchlist`

**Mobile behavior:**
- `useIsMobile()` hook hides sidebar entirely
- Hamburger ☰ button in nav triggers mobile drawer
- Mobile drawer: `position: fixed`, slides in from left with `transform: translateX()`
  - Open: `translateX(0)`, Closed: `translateX(-100%)`
  - Semi-transparent overlay behind drawer closes it on tap
  - `mobileDrawerOpen` state controls visibility

**Brief cards grid:**
- `display: grid, gridTemplateColumns: repeat(auto-fill, minmax(300px, 1fr))`
- Cards show: company name, snippet preview (uses `brief.brief` not `brief.brief_json`), date, length badge, saved bookmark icon
- On click: navigate to `/brief/:id`

**Data fetching:**
- `fetchData()` called on mount: parallel `Promise.all` for `/api/briefs` + `/api/watchlist`
- `setBriefs(briefsRes.data.briefs || [])` — response is `{ briefs: [] }` not a plain array
- **Critical:** API returns `brief.brief` (parsed object) not `brief.brief_json` (string)

### BriefGeneratorPage.jsx
- Company name input (pre-filled from `?company=` query param if coming from watchlist)
- Length selector: short / medium / long (reads from `prefsStore.defaultLength`)
- Section toggles: 6 pill buttons (summary, news, financials, social_sentiment, talking_points, watch_out_for)
  - Minimum 1 section must stay selected
- Rotating status messages during generation (cycles every 3s)
- Full-screen loading overlay with spinner during generation
- On success: `navigate('/brief/${result.brief_id}')`
- Error handling for non-429 errors; 429 handling added in Phase 4 (RateLimitModal)

**Status messages cycle:**
```
"Searching for recent news on {company}..."
"Analyzing financial signals..."
"Checking social sentiment..."
"Writing your brief..."
"Almost done..."
```

### BriefDisplayPage.jsx
Most complex page after Dashboard.

**Route detection:**
- `const { id, token } = useParams()`
- `const isShareView = !!token` — used to hide action buttons on public share views

**API calls:**
- If `token`: `api.get('/api/share/${token}')` (public, no auth)
- If `id`: `api.get('/api/briefs/${id}')` (authenticated)

**Data shape from API:**
```json
{
  "brief": { "summary": {...}, "news": {...}, ... },  // PARSED OBJECT, not string
  "company_name": "...",
  "created_at": "...",
  "saved": false,
  "length": "...",
  "sources_used": [...],  // ALREADY AN ARRAY, not a string
  "id": 4
}
```

**Brief section shape:**
```json
{
  "content": ["sentence 1", "sentence 2"],  // CAN BE string, string[], object, or object[]
  "confidence": "high" | "medium" | "low",
  "sources": ["url1", "url2"]
}
```

**SectionCard component** handles all content shapes:
- String → renders as `<p>`
- Array of strings → renders each as `<p>`
- Object → renders each key-value pair as `<p>`
- Array of objects → renders each object's values as `<p>`

**Features:**
- View toggle: tabs / cards (reads from `prefsStore.defaultView`)
- Tabs: horizontal scroll, active tab underlined in accent yellow
- Cards: `display: grid, repeat(auto-fill, minmax(380px, 1fr))`
- Confidence badges: green (high), yellow/acid (medium), red (low)
- Thumbs up/down feedback per section → `POST /api/briefs/:id/feedback`
- "Poor quality" banner shown when ≥3 sections thumbed down
- Save button → `PATCH /api/briefs/:id/save`
- Share button → `POST /api/briefs/:id/share` → copies URL to clipboard
- Regenerate button → navigates to `/brief/new?company=X`
- Sources panel: collapsible, shows all source URLs as links
- Share view (`isShareView=true`): hides Save, Share, Regenerate, feedback buttons

### HistoryPage.jsx
- Lists all briefs with search, date filter (all/today/this week/this month), saved-only toggle
- Delete with confirmation modal → `DELETE /api/briefs/:id`
- Clicking a row navigates to `/brief/:id`

### SettingsPage.jsx
- **Change password:** `POST /api/auth/change-password` with `{current_password, new_password}`
- **Preferences:** length + view toggles saved to `prefsStore` (localStorage only in Phase 3; backend sync added in Phase 4)
- **Subscription:** Shows "Free Plan" + locked "Pro Plan — Coming Soon" card
- **Danger zone:** Delete account → `DELETE /api/auth/account` → logout + navigate to `/`
- Both have confirmation flows

---

## Backend API Routes Used by Frontend (Phase 3 state)

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register, returns token |
| `/api/auth/login` | POST | No | Login, returns token + user |
| `/api/auth/change-password` | POST | Yes | Change password |
| `/api/auth/account` | DELETE | Yes | Delete account + all data |
| `/api/brief` | POST | Yes | Generate brief, rate-limited |
| `/api/briefs` | GET | Yes | List user's briefs — returns `{ briefs: [] }` |
| `/api/briefs/:id` | GET | Yes | Get single brief — **added in Phase 3** |
| `/api/briefs/:id/save` | PATCH | Yes | Toggle saved flag |
| `/api/briefs/:id/share` | GET, POST | Yes | Get/generate share token |
| `/api/briefs/:id/feedback` | POST | Yes | Submit section feedback |
| `/api/share/:token` | GET | No | Public share view |
| `/api/watchlist` | GET, POST | Yes | List / add watchlist entries |
| `/api/watchlist/:id` | DELETE | Yes | Remove from watchlist |

**Backend fixes made during Phase 3:**
- Added `GET /api/briefs/:id` route (was missing — only list route existed)
- Added `POST` method to `GET /api/briefs/:id/share` route
- Fixed share URL in frontend: `/api/brief/share/${token}` → `/api/share/${token}`
- Fixed CrewAI agent: `max_iter=8`, sequential search instructions, 200-word plain-text summary constraint to fix Groq `tool_use_failed` error
- Reduced `max_results=3` in Tavily tool to prevent token overflow

---

## Key Bugs Discovered & Fixed in Phase 3

1. **`brief.brief_json` vs `brief.brief`** — The `/api/briefs` list endpoint returns `brief` (parsed object) not `brief_json` (raw string). Frontend had to use `brief.brief` not `JSON.parse(brief.brief_json)`.

2. **Share route mismatch** — Frontend called `/api/brief/share/:token`, backend had `/api/share/:token`. Fixed.

3. **Missing GET /api/briefs/:id** — Backend only had list route, not single-brief fetch. Added in Phase 3.

4. **Groq `tool_use_failed`** — CrewAI researcher agent hit Groq's token limit when running all 4 searches simultaneously. Fixed with: sequential search instructions, max_iter=8, 200-word plain-text output constraint.

5. **SectionCard crashing on object content** — AI sometimes returns `{description: "...", risk: "..."}` objects instead of strings. Fixed with bulletproof content renderer.

6. **Vite HMR stale cache** — CSS changes not reflecting until hard refresh (Cmd+Shift+R). Normal Vite behavior.

7. **React Hooks order violation** — `useIsMobile()` placed after early return in BriefDisplayPage. Moved to top of component.

---

## PWA Config (vite.config.js)

```js
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'PitchPulse',
    short_name: 'PitchPulse',
    theme_color: '#C8FF00',
    background_color: '#0A0A0A',
    display: 'standalone',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  }
})
```

Install banner in App.jsx fires after 30 seconds on first visit (checks `localStorage('pwa_dismissed')`).

---

## Rate Limiting

- User's own app: 3 briefs/hour on free tier (stored in User model)
- To reset during development: `rm instance/pitchpulse.db` then restart backend

---

## Local Dev Setup

```bash
# Backend (Tab 1)
cd "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/backend"
source venv/bin/activate     # Python 3.11.9
python app.py                # runs on :5001

# Frontend (Tab 2)
cd "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/frontend"
npm run dev                  # runs on :5173
```

SQLite DB location: `backend/instance/pitchpulse.db`
Reset DB: `rm instance/pitchpulse.db` then restart backend (wipes all users + briefs).

---

## What Phase 4 Covers (Next)

Phase 4 = polish + production prep before deployment:
1. Brief card preview fix (DashboardPage uses `brief.brief` not `brief.brief_json`)
2. `PATCH /api/user/preferences` backend route + `preferences` column on User
3. Customize gear sidebar (CustomizePanel.jsx) — theme, default view, panel toggles
4. Mobile layout improvements
5. Loading skeletons (Skeletons.jsx)
6. Rate limit modal (RateLimitModal.jsx)
7. Financial data stub improvements
8. Share page viral banner
9. Production prep (gunicorn, render.yaml, vercel.json, CORS, postgres URL fix)
10. Meta tags + favicon

---

*Last updated: Phase 3 complete. Full React frontend built and working locally. All pages functional. Dark/light mode, mobile responsive, PWA configured. Ready for Phase 4 polish.*
