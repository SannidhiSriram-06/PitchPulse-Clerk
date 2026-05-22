# PitchPulse — Phase 2 Context File
Paste this entire file into a new chat to bring Claude fully up to speed on Phase 2 completion.

---

## What Phase 2 Was

Phase 2 added authentication, JWT, database persistence, rate limiting, and all brief/watchlist management routes to the backend. No frontend yet — everything was tested with curl. Phase 1 (agents, tools, basic Flask skeleton) was already complete.

---

## Project Overview

**PitchPulse** is a full-stack AI-powered pre-meeting sales brief generator built for the BITSoM Product Management with Agentic AI Cohort 2 final project (PS4). It uses a 3-agent CrewAI pipeline (Researcher → Analyst → Formatter) to generate structured, sourced company briefs in 15–90 seconds.

---

## Local Project Path

```
/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/
├── backend/
│   ├── app.py           # Flask app factory + all routes (18 total)
│   ├── agents.py        # CrewAI agents (max_iter=8, sequential search)
│   ├── tools.py         # Tavily web search (max_results=3), financial stub
│   ├── models.py        # User, Brief, Watchlist models
│   ├── database.py      # db = SQLAlchemy(), init_db() calls create_all()
│   ├── auth.py          # JWT helpers, bcrypt, require_auth decorator, validators
│   ├── config.py        # Config class with all env vars
│   ├── requirements.txt
│   └── .env             # NOT committed — contains all secrets
└── (frontend/ — not yet built, Phase 3)
```

---

## Tech Stack (Backend)

- **Python 3.13.9** with virtualenv at `backend/venv/`
- **Flask 3.x** with factory pattern (`create_app()` in app.py)
- **Flask-CORS** — `origins="*"` for dev (lock down for prod)
- **Flask-SQLAlchemy** — ORM
- **SQLite** — stored at `backend/instance/pitchpulse.db` (Flask instance folder)
- **bcrypt** — password hashing (12 rounds)
- **PyJWT** — JWT tokens (HS256, 24hr expiry)
- **email-validator** — email format validation
- **CrewAI 1.14.4** — multi-agent orchestration
- **Groq** (via LiteLLM) — LLM inference, model: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Tavily Python** — real-time web search

---

## Database Models (SQLite, Phase 2 schema)

### User (table: `users`)
```python
id                  Integer, primary key
email               String(255), unique, not null
password_hash       String(255), not null     # bcrypt hash, NEVER returned in any response
tier                String(50), default="free"
briefs_used_this_hour  Integer, default=0
hour_window_start   DateTime(timezone=True), nullable
created_at          DateTime(timezone=True)
# Relationships: briefs (cascade delete), watchlist (cascade delete)
```

### Brief (table: `briefs`)
```python
id                  Integer, primary key
user_id             Integer, FK -> users.id (CASCADE)
company_name        String(255)
length              String(50), default="medium"
sections_requested  Text                      # comma-separated string
brief_json          Text                      # full JSON blob (stringified)
sources_used        Text                      # JSON array string
generation_time_ms  Integer
limited_data        Boolean, default=False
saved               Boolean, default=False    # user bookmarked
feedback_summary    Text, nullable            # JSON {"news": "up", ...}
share_token         String(64), unique, nullable  # public share token
created_at          DateTime(timezone=True)
```

**brief.to_dict()** returns: id, user_id, company_name, length, sections_requested (as list), brief (parsed dict), sources_used (parsed list), generation_time_ms, limited_data, saved, feedback_summary (parsed dict), share_token, created_at.

**Note:** The to_dict() field is `brief` (parsed), not `brief_json` (raw string). Frontend must use `data.brief` not `JSON.parse(data.brief_json)`.

### Watchlist (table: `watchlist`)
```python
id              Integer, primary key
user_id         Integer, FK -> users.id (CASCADE)
company_name    String(255)
added_at        DateTime(timezone=True)
last_briefed_at DateTime(timezone=True), nullable
```

---

## Auth Architecture (auth.py)

### Input validation
- `validate_email(email)` — returns `(bool, error_msg)`, checks format + length
- `validate_password(password)` — returns `(bool, error_msg)`, min 8, max 128 chars
- `sanitize_company_name(name)` — returns `(str|None, error_msg)`, strips, max 100 chars, alphanumeric + spaces + `-.,&'()`

### Password hashing
- `hash_password(plain)` — bcrypt 12 rounds, returns decoded str
- `check_password(plain, hashed)` — bcrypt compare, returns bool

### JWT
- `generate_token(user_id)` — payload: `{"sub": str(user_id), "iat": ..., "exp": ...}`
  - **`sub` is a STRING** (str(user_id)) — PyJWT requires string sub
- `decode_token(token)` — returns `(payload|None, error_msg)`
  - ExpiredSignatureError → "Session expired, please login again"
  - InvalidTokenError → "Please login to continue"

### require_auth decorator
- Reads `Authorization: Bearer <token>` header
- Decodes JWT, looks up `User.query.get(int(payload["sub"]))`
  - **Must cast back to int** when querying DB
- Sets `g.current_user` to the User ORM object
- Returns 401 with `{"error": "Please login to continue"}` on failure

---

## Rate Limiting

- Free tier: 3 briefs per hour per user
- Stored in User model: `briefs_used_this_hour` + `hour_window_start`
- Logic in `_check_and_increment_rate_limit(user)`:
  - If no window or window > 1hr ago: reset counter, set new window start
  - If count >= 3: return `(False, 0)`
  - Otherwise: increment, commit, return `(True, remaining)`
- **Critical:** SQLite returns timezone-naive datetimes. Must do `window.replace(tzinfo=UTC)` before subtracting from `datetime.now(UTC)`
- On limit hit: returns HTTP 429 with `{"error": "Rate limit reached. Upgrade to Pro for unlimited briefs."}`

---

## All API Routes (Phase 2 complete state)

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/health` | GET | No | Returns `{"status":"ok"}` |
| `/api/auth/register` | POST | No | Creates user, returns JWT |
| `/api/auth/login` | POST | No | Returns JWT + user info |
| `/api/auth/me` | GET | Yes | Returns current user |
| `/api/auth/change-password` | POST | Yes | Updates password |
| `/api/auth/account` | DELETE | Yes | Deletes user + all data (cascade) |
| `/api/brief` | POST | Yes | Generates brief, rate-limited, saves to DB |
| `/api/briefs` | GET | Yes | Lists user's briefs (supports `?search=`, `?saved=true`) |
| `/api/briefs/:id/save` | PATCH | Yes | Toggles saved=True/False |
| `/api/briefs/:id` | DELETE | Yes | Deletes one brief |
| `/api/briefs/:id/feedback` | POST | Yes | Stores section feedback in feedback_summary |
| `/api/briefs/:id/share` | GET | Yes | Returns/generates share token |
| `/api/share/:share_token` | GET | **No** | Public — returns brief for display |
| `/api/watchlist` | GET | Yes | Returns user's watchlist |
| `/api/watchlist` | POST | Yes | Adds company to watchlist |
| `/api/watchlist/:id` | DELETE | Yes | Removes watchlist entry |

### Route Details

**POST /api/auth/register**
- Body: `{"email": "...", "password": "..."}`
- Validation: valid email format, password 8+ chars, email not already registered
- Returns: `{"message": "Account created", "token": "eyJ..."}` (201)
- Error: 409 if email exists, 400 on validation fail

**POST /api/auth/login**
- Body: `{"email": "...", "password": "..."}`
- Returns: `{"token": "...", "user": {"id": 1, "email": "...", "tier": "free", "briefs_remaining_this_hour": 3, ...}}`
- Uses constant-time check to prevent timing attacks (runs bcrypt even if user not found)

**POST /api/brief**
- Body: `{"company_name": "Infosys", "length": "short|medium|long", "sections": ["summary", "news", ...]}`
- Validates length (must be short/medium/long), filters sections to valid set
- Calls `Config.validate()` before running agents
- Calls `run_brief(company_name, length, requested_sections)` from agents.py
- Updates `last_briefed_at` on watchlist if company is there
- Saves Brief to DB
- Returns: `{"brief": {...}, "sources_used": [...], "generation_time_ms": 9803, "limited_data": false, "brief_id": 1, "briefs_remaining_this_hour": 2}`

**GET /api/briefs**
- Returns: `{"briefs": [brief.to_dict(), ...]}`
- **Response shape is `{briefs: []}` NOT a plain array**

**POST /api/briefs/:id/feedback**
- Body: `{"section": "news", "rating": "up" | "down"}`
- Merges into existing feedback_summary JSON, saves back

**GET /api/briefs/:id/share**
- Generates `secrets.token_urlsafe(32)` if no share_token exists
- Returns: `{"brief_id": 1, "share_token": "...", "share_url": "/api/share/..."}`

**GET /api/share/:share_token** (public, no auth)
- Returns: `{"company_name": "...", "brief": {...}, "sources_used": [...], "created_at": "..."}`

---

## Environment Variables (.env)

```
GROQ_API_KEY=...
TAVILY_API_KEY=...
SECRET_KEY=...                    # Flask secret key
JWT_SECRET_KEY=...                # 128-char hex string (generate with secrets.token_hex(64))
JWT_EXPIRY_HOURS=24
DATABASE_URL=sqlite:///pitchpulse.db  # auto-managed by Flask instance folder
CREWAI_TRACING_ENABLED=false
```

### Config class key constants
```python
Config.FREE_TIER_HOURLY_LIMIT = 3
Config.JWT_SECRET_KEY           # used in generate_token() and decode_token()
Config.JWT_EXPIRY_HOURS         # int, defaults to 24
```

---

## Agents (Phase 1 + Phase 2 fixes)

All in `backend/agents.py`. Changes made during Phase 2 to fix Groq `tool_use_failed`:
- Researcher agent: `max_iter=8` (was 4)
- Task description: explicit sequential search instructions — "run ONE search at a time, wait for results, then run the next"
- Final summary: "200 words max, plain sentences only, no markdown"
- Model: `groq/meta-llama/llama-4-scout-17b-16e-instruct` (on all 3 agents)
- `verbose=False` on all agents (set in Phase 4, may still be True in Phase 2)

`backend/tools.py` fix: `max_results=3` (was 7) to reduce Groq token overflow.

---

## Bugs Found & Fixed in Phase 2

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `RuntimeError: SQLAlchemy already registered` | `db.init_app(app)` called twice — once in `create_app()` and once inside `init_db()` | Removed `db.init_app()` from `init_db()`, only called in `create_app()` |
| `no such column: users.password_hash` | Old Phase 1 DB still on disk | Deleted `instance/pitchpulse.db` (Flask uses `instance/` subfolder, not root) |
| `jwt.exceptions.DecodeError: Subject must be a string` | PyJWT requires `sub` to be a string, was passing `int` | Changed to `"sub": str(user_id)` in generate_token, `User.query.get(int(payload["sub"]))` in require_auth |
| `ImportError: cannot import name 'config' from 'config'` | Phase 1 files used `from config import config` (lowercase) but class is `Config` (uppercase) | Changed to `from config import Config` in tools.py and agents.py; all `config.X` → `Config.X` |
| `TypeError: can't subtract offset-naive and offset-aware datetimes` | SQLite returns timezone-naive datetimes, `datetime.now(UTC)` is timezone-aware | Added `window.replace(tzinfo=UTC)` when `window.tzinfo is None` in rate limit check |

---

## Local Dev Setup

```bash
# Terminal Tab 1 — Backend server
cd "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/backend"
source venv/bin/activate
python app.py    # runs on :5001

# Test with curl
curl http://localhost:5001/api/health

# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpass123"}'
```

SQLite DB location: `backend/instance/pitchpulse.db`
Reset DB: `rm instance/pitchpulse.db` then restart server. All users and briefs are wiped.

---

## GitHub Repo

https://github.com/SannidhiSriram-06/PitchPulse (private)

Initialized with git in Phase 2. Main branch.

---

## What Phase 3 Covers (Next)

Phase 3 = full React frontend from scratch using Vite:
- LandingPage, AuthPage, OnboardingPage, DashboardPage, BriefGeneratorPage, BriefDisplayPage, HistoryPage, SettingsPage
- Zustand stores: authStore, briefStore, prefsStore
- Axios api.js with JWT interceptor and 401 redirect
- Tailwind CSS v4 + Space Grotesk font
- React Router DOM routing with ProtectedRoute
- Dark/light mode, mobile responsive, PWA install prompt

---

*Last updated: Phase 2 complete. All 16 backend routes working. Auth, JWT, rate limiting, brief management, watchlist all tested with curl. No frontend yet.*
