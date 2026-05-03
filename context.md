# PitchPulse — Project Context

> **Last updated:** Phase 2 complete (auth, JWT, brief management, watchlist)
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
│   ├── app.py               ← Flask app factory, all API routes (auth + brief + watchlist)
│   ├── auth.py              ← JWT helpers, bcrypt wrappers, require_auth decorator, input validators
│   ├── agents.py            ← 3 CrewAI agents, their tasks, and run_brief() orchestrator
│   ├── tools.py             ← Tavily search tool + financial data stub (CrewAI tool wrappers)
│   ├── models.py            ← SQLAlchemy ORM models: User, Brief, Watchlist tables
│   ├── database.py          ← SQLAlchemy db instance, init_db() function
│   ├── config.py            ← Loads .env via dotenv, exposes Config class with all settings
│   ├── requirements.txt     ← Python dependencies (unpinned where needed for compatibility)
│   ├── .env                 ← Local secrets (NOT committed to Git)
│   ├── .env.example         ← Template showing required env var names, safe to commit
│   └── venv/                ← Python virtual environment (NOT committed to Git)
└── frontend/                ← Empty folder. React + Vite + Tailwind goes here in Phase 3.
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
| `CREWAI_TRACING_ENABLED` | Optional | Set to `false` to suppress CrewAI's trace prompt on every run |

---

## 4. API Routes

### Auth Flow

Tokens go in the `Authorization` header as `Bearer <token>` on all protected routes.
A missing or expired token returns `401` with `"Please login to continue"` or `"Session expired, please login again"`.

---

### `GET /api/health`

**Purpose:** Liveness check. No auth required.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /api/auth/register`

**Purpose:** Create a new account.

**Request body:**
```json
{ "email": "user@example.com", "password": "mypassword" }
```

**Validation:**
- Email must be valid format, max 255 chars
- Password must be at least 8 chars, max 128 chars
- Email must not already exist (returns 409 if duplicate)

**Success (201):**
```json
{ "message": "Account created", "token": "eyJ..." }
```

---

### `POST /api/auth/login`

**Purpose:** Login and get a JWT token.

**Request body:**
```json
{ "email": "user@example.com", "password": "mypassword" }
```

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

**Purpose:** Get current user info.

**Success (200):** Same shape as `user` object in login response.

---

### `POST /api/auth/change-password` 🔒

**Request body:**
```json
{ "current_password": "...", "new_password": "..." }
```

**Success (200):** `{ "message": "Password updated successfully." }`

---

### `DELETE /api/auth/account` 🔒

**Purpose:** Delete account and all associated briefs (cascade).

**Success (200):** `{ "message": "Account deleted." }`

---

### `POST /api/brief` 🔒

**Purpose:** Run 3 CrewAI agents and return a structured pre-meeting brief.

Rate limited: free tier = 3 briefs per hour. Pro = unlimited.

**Request body:**
```json
{
  "company_name": "Infosys",
  "length": "medium",
  "sections": ["summary", "news", "financials", "social_sentiment", "talking_points", "watch_out_for"]
}
```

| Field | Type | Required | Valid Values |
|---|---|---|---|
| `company_name` | string | ✅ | 2–100 chars, alphanumeric + spaces + `-.,&'()` only |
| `length` | string | No (default: `"medium"`) | `"short"`, `"medium"`, `"long"` |
| `sections` | array of strings | No (default: all) | see valid sections below |

**Valid section values:**
`summary`, `news`, `financials`, `social_sentiment`, `talking_points`, `watch_out_for`

**Success response (200):**
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

**Error responses:**

| Code | Condition |
|---|---|
| 400 | Missing/invalid company_name |
| 400 | Invalid company (not enough data found) |
| 400 | Invalid sections |
| 429 | Free tier hourly limit hit |
| 500 | Missing API keys or agent failure |

---

### `GET /api/briefs` 🔒

**Purpose:** List user's briefs, newest first.

**Query params:**
- `?search=infosys` — filter by company name (case-insensitive)
- `?saved=true` — only return saved/bookmarked briefs

**Success (200):**
```json
{ "briefs": [ { ...brief objects... } ] }
```

---

### `PATCH /api/briefs/:id/save` 🔒

**Purpose:** Toggle saved/bookmarked status of a brief.

**Success (200):** `{ "id": 1, "saved": true }`

---

### `DELETE /api/briefs/:id` 🔒

**Purpose:** Delete one of the current user's briefs.

**Success (200):** `{ "message": "Brief deleted." }`

---

### `POST /api/briefs/:id/feedback` 🔒

**Purpose:** Record thumbs up/down on a specific section of a brief.

**Request body:**
```json
{ "section": "news", "rating": "up" }
```

`rating` must be `"up"` or `"down"`. `section` must be one of the 6 valid section names.

**Success (200):**
```json
{ "brief_id": 1, "feedback": { "news": "up" } }
```

---

### `GET /api/briefs/:id/share` 🔒

**Purpose:** Generate (or retrieve existing) public share token for a brief.

**Success (200):**
```json
{
  "brief_id": 1,
  "share_token": "abc123...",
  "share_url": "/api/share/abc123..."
}
```

---

### `GET /api/share/:share_token` (public, no auth)

**Purpose:** View a shared brief by its token. No login required.

**Success (200):**
```json
{
  "company_name": "Infosys",
  "brief": { ... },
  "sources_used": [...],
  "created_at": "..."
}
```

**Failure (404):** `{ "error": "Shared brief not found or link has expired." }`

---

### `GET /api/watchlist` 🔒

**Purpose:** Get user's watchlist, sorted by most recently added.

**Success (200):**
```json
{ "watchlist": [ { "id": 1, "company_name": "Infosys", "added_at": "...", "last_briefed_at": "..." } ] }
```

---

### `POST /api/watchlist` 🔒

**Purpose:** Add a company to the watchlist.

**Request body:** `{ "company_name": "Infosys" }`

**Success (201):** Watchlist entry object.

**Failure (409):** `{ "error": "Infosys is already on your watchlist." }`

---

### `DELETE /api/watchlist/:id` 🔒

**Purpose:** Remove a company from the watchlist.

**Success (200):** `{ "message": "Removed from watchlist." }`

---

## 5. Database Schema

**Engine:** SQLite in development (`pitchpulse.db` created in `backend/`). Planned: PostgreSQL on Render.

### `users` table

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `email` | String(255), UNIQUE | User identifier, stored lowercase |
| `password_hash` | String(255) | bcrypt hash — NEVER returned in any API response |
| `tier` | String(50) | `"free"` or `"pro"`. Default: `"free"` |
| `briefs_used_this_hour` | Integer | Counter reset every 60 mins. Default: 0 |
| `hour_window_start` | DateTime | Timestamp when current window started (timezone-aware UTC) |
| `created_at` | DateTime | Row creation timestamp |

### `briefs` table

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → users.id, CASCADE DELETE) | Links brief to owner |
| `company_name` | String(255) | The queried company |
| `length` | String(50) | `"short"`, `"medium"`, or `"long"` |
| `sections_requested` | Text | Comma-separated list of requested sections |
| `brief_json` | Text | Full JSON blob of the generated brief |
| `sources_used` | Text | JSON array of source URLs |
| `generation_time_ms` | Integer | Time taken in milliseconds |
| `limited_data` | Boolean | True if fewer than 2 search results found |
| `saved` | Boolean | True if user bookmarked this brief. Default: False |
| `feedback_summary` | Text | JSON dict of section → "up"/"down". Null initially |
| `share_token` | String(64), UNIQUE | URL-safe token for public sharing. Null until shared |
| `created_at` | DateTime | Row creation timestamp |

### `watchlist` table

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → users.id, CASCADE DELETE) | Owner |
| `company_name` | String(255) | Pinned company name |
| `added_at` | DateTime | When it was added to the watchlist |
| `last_briefed_at` | DateTime | Nullable. Updated when a brief is run for this company |

---

## 6. Auth Architecture

- **Method:** Email + password. No OAuth.
- **Hashing:** bcrypt with 12 rounds (via `bcrypt` Python library)
- **Token format:** JWT signed with HS256 using `JWT_SECRET_KEY`
- **Token payload:** `{ sub: user_id, iat: issued_at, exp: expiry }`
- **Token expiry:** 24 hours (configurable via `JWT_EXPIRY_HOURS`)
- **Token location:** `Authorization: Bearer <token>` header on all protected routes
- **Protected route decorator:** `@require_auth` in `auth.py` — sets `g.current_user` to the User ORM object
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
| **What it does** | Runs 4 targeted Tavily searches (news, products, leadership, competitors), fetches financial stub. Compiles research summary with source URLs and `total_results_found`. |

### Agent 2 — Strategic Business Analyst

| Property | Value |
|---|---|
| **Role** | Strategic Business Analyst |
| **LLM** | Groq via LiteLLM — `groq/meta-llama/llama-4-scout-17b-16e-instruct` |
| **Tools** | None (reasoning only) |
| **Max iterations** | 3 |
| **What it does** | Reads Agent 1's research. Extracts pain points, strategic shifts, sentiment. Produces talking points and watch-out items. |

### Agent 3 — Pre-Meeting Brief Specialist

| Property | Value |
|---|---|
| **Role** | Pre-Meeting Brief Specialist |
| **LLM** | Groq via LiteLLM — `groq/meta-llama/llama-4-scout-17b-16e-instruct` |
| **Tools** | None |
| **Max iterations** | 2 |
| **What it does** | Formats all prior outputs into a single valid JSON brief. Each section has `content`, `confidence`, and `sources`. Outputs ONLY JSON. |

### CrewAI Process
- `Process.sequential` — Research → Analysis → Briefing
- Each task receives context from prior tasks via `context=[]`
- Typical generation time: 15–30 seconds for `short`, 30–90 seconds for `medium`/`long`

---

## 8. What Was Completed

### Phase 1 ✅
- Full backend folder structure
- `config.py` with env loading and `validate()`
- `database.py` with SQLAlchemy + `init_db()`
- `models.py` with `User` and `Brief` ORM models
- `tools.py` with Tavily search tool and financial stub
- `agents.py` with 3 agents using `crewai.LLM` wrapper
- `app.py` with Flask factory, `/api/health`, `/api/brief`, rate limiting, error handling
- `datetime.utcnow()` replaced with `datetime.now(UTC)` throughout (Python 3.12+ compatible)
- Brief length options: short / medium / long
- All briefs saved to SQLite
- End-to-end test passed: Infosys brief returned in ~18 seconds with real Tavily data

### Phase 2 ✅
- `auth.py` — JWT helpers, bcrypt wrappers, `require_auth` decorator, input validators, `sanitize_company_name`
- `models.py` updated — `password_hash` on User; `saved`, `feedback_summary`, `share_token` on Brief; new `Watchlist` model
- `config.py` updated — `JWT_SECRET_KEY`, `JWT_EXPIRY_HOURS`, `FREE_TIER_HOURLY_LIMIT`
- `app.py` updated — CORS added, all new routes registered, `/api/brief` now requires auth
- `requirements.txt` updated — added `bcrypt`, `PyJWT`, `flask-cors`, `email-validator`
- Auth routes: register, login, me, change-password, delete account
- Brief management routes: list, save/unsave toggle, delete, feedback, share token, public share view
- Watchlist routes: get, add, remove
- Rate limiting wired to JWT-authenticated user (not hardcoded demo user)
- `sanitize_company_name` enforces 100-char max + allowed character set on brief requests
- Password hashes never returned in any API response (enforced in `User.to_dict()`)
- Cascade deletes: deleting a user removes all their briefs and watchlist entries
- Share tokens generated with `secrets.token_urlsafe(32)` — cryptographically random

**Confirmed working curl (register + brief):**
```bash
# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'

# Copy token, then:
curl -X POST http://localhost:5001/api/brief \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"company_name": "Infosys", "length": "short", "sections": ["summary", "news"]}' \
  --max-time 120
```

**To run:**
```bash
cd PitchPulse/backend
source venv/bin/activate
python app.py
# Server runs on http://127.0.0.1:5001
```

---

## 9. What Is NOT Yet Built

- **Frontend:** `frontend/` folder is empty. Phase 3 = React + Vite + Tailwind.
- **Real financial data:** `company_financial_data` in `tools.py` returns stub data. Wire Alpha Vantage or FMP later.
- **Pro tier upgrade flow:** Tier field exists on User model. No payment integration.
- **Deployment:** Local only. Render + PostgreSQL planned for Phase 4.
- **Caching:** No caching. Same company re-runs all agents every time.
- **Email verification:** Users can register with any email. No verification email sent.
- **Password reset:** No forgot-password/reset flow.
- **Token refresh:** JWT tokens expire after 24h with no refresh mechanism. User must re-login.

---

## 10. Decisions Made and Why

| Decision | Choice | Reason |
|---|---|---|
| LLM | Groq (llama-4-scout-17b-16e-instruct) | Fast inference, generous free tier |
| LLM wrapper | `crewai.LLM` with `groq/` prefix via LiteLLM | CrewAI 1.x dropped native langchain-groq support |
| Agent framework | CrewAI 1.14.4 | Multi-agent sequential pipelines, tool integration |
| Search | Tavily | Best structured output for AI agent search |
| Database (dev) | SQLite | Zero setup, file-based |
| Database (prod) | PostgreSQL (planned) | Render free tier, scales properly |
| Backend | Flask 3.0.3 | Lightweight, no overhead |
| Port | 5001 | Port 5000 hijacked by macOS AirPlay Receiver on Monterey+ |
| Tool import | `from crewai.tools import tool` | CrewAI 1.x location (not `from crewai import tool`) |
| Auth | Email + password, no OAuth | Simpler to build and test without OAuth provider setup |
| Password hashing | bcrypt (12 rounds) | Industry standard, resistant to brute force |
| Token format | JWT (PyJWT, HS256) | Stateless, no server-side session store needed |
| CORS | flask-cors, `origins="*"` in dev | Required before Phase 3 frontend; lock down origin in prod |
| Input sanitization | Regex on company_name in `auth.py` | Prevents agent prompt injection via company name field |

---

## 11. Known Issues / Watch Out For

1. **macOS AirPlay on port 5000:** Flask runs on 5001. Don't change it back.

2. **LiteLLM must be in the venv:** Always `source venv/bin/activate` first.

3. **Circular import fix in database.py:** `import models` must stay inside the `init_db()` function body.

4. **JSON parse fallback:** The briefing agent sometimes wraps output in markdown fences. `_extract_json()` in `agents.py` handles this.

5. **CrewAI tracing prompt:** Add `CREWAI_TRACING_ENABLED=false` to `.env`.

6. **Groq free tier TPM limits:** Wait 30 seconds and retry on 500 with Groq rate limit detail.

7. **CrewAI version sensitivity:** Pinned to `crewai==1.14.4`. Don't upgrade without testing.

8. **SQLite concurrency:** Fine for dev. Must migrate to PostgreSQL before production.

9. **`verbose=True` on all agents:** Set to `False` before deploying.

10. **Schema changes require DB deletion in dev:** SQLAlchemy won't auto-migrate. If you change models, `rm pitchpulse.db` and restart to recreate from scratch.

11. **JWT_SECRET_KEY in dev:** If not set in `.env`, the app will print a warning but still run. In production this must be set to a real secret or tokens are insecure.

12. **Rate limit reset in dev:** The hourly window is a real 60-minute window. To test reset behavior, temporarily change `timedelta(hours=1)` to `timedelta(seconds=10)` in `_check_and_increment_rate_limit` in `app.py`.
