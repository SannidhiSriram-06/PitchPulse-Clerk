# PitchPulse — Phase 1 Context File
Paste this entire file into a new chat to bring Claude fully up to speed on Phase 1 completion.

---

## What Phase 1 Was

Phase 1 built the entire backend skeleton — Flask app, SQLAlchemy models, CrewAI multi-agent pipeline, Tavily web search integration, and a working `/api/brief` endpoint with rate limiting. No auth yet (that's Phase 2), no frontend (Phase 3).

---

## Project Overview

**PitchPulse** is a full-stack AI-powered pre-meeting sales brief generator built for the BITSoM Product Management with Agentic AI Cohort 2 final project (PS4). It uses a 3-agent CrewAI pipeline (Researcher → Analyst → Formatter) to generate structured, sourced company briefs in 15–90 seconds.

---

## Local Project Path

```
/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/
├── context.md           # this file
└── backend/
    ├── app.py           # Flask app, /api/health, /api/brief, rate limiting, demo user
    ├── agents.py        # CrewAI 3-agent pipeline, run_brief(), _extract_json()
    ├── tools.py         # Tavily web search tool, financial data stub
    ├── models.py        # User and Brief SQLAlchemy models
    ├── database.py      # db = SQLAlchemy(), init_db() with circular import fix
    ├── config.py        # Config class, loads from .env, validate() method
    ├── requirements.txt
    ├── .env             # NOT committed — contains real API keys
    └── venv/            # Python virtualenv
```

---

## Tech Stack (Phase 1)

- **Python 3.13.9** with virtualenv at `backend/venv/`
- **Flask 3.0.3** — web framework, running on port **5001** (not 5000 — macOS AirPlay hijacks 5000)
- **Flask-SQLAlchemy 3.1.1** — ORM
- **SQLite** — stored at `backend/instance/pitchpulse.db` (Flask instance folder, not backend root)
- **CrewAI 1.14.4** — multi-agent orchestration
- **LiteLLM** — installed separately via `pip install litellm` (required by CrewAI 1.x to use Groq)
- **Groq** — LLM inference via LiteLLM, model: `groq/meta-llama/llama-4-scout-17b-16e-instruct`
- **Tavily Python 0.5.0** — real-time web search, `max_results=3`
- **python-dotenv >=1.2.2** — env var loading

### requirements.txt
```
flask==3.0.3
flask-sqlalchemy==3.1.1
python-dotenv>=1.2.2
crewai==1.14.4
tavily-python==0.5.0
sqlalchemy==2.0.36
```

Note: `litellm` was installed separately after the main requirements, not pinned in requirements.txt. Add it before running fresh on a new machine.

---

## Environment Variables (.env)

```
GROQ_API_KEY=gsk_...          # from console.groq.com
TAVILY_API_KEY=tvly-dev-...   # from app.tavily.com
SECRET_KEY=pitchpulse-dev-secret-123
DATABASE_URL=sqlite:///pitchpulse.db
CREWAI_TRACING_ENABLED=false  # prevents CrewAI from asking about telemetry
```

**Keys never committed to git.** `.gitignore` covers: `.env`, `__pycache__/`, `*.db`, `venv/`

---

## Database Models (Phase 1 schema)

### User (table: `users`)
```python
id                    Integer, primary key
email                 String(255), unique
tier                  String(50), default="free"      # "free" | "pro"
briefs_used_this_hour Integer, default=0
hour_window_start     DateTime(timezone=True), nullable
created_at            DateTime(timezone=True)
```

Note: No `password_hash` yet — Phase 1 uses a demo user with hardcoded email `demo@pitchpulse.dev`. Real auth (bcrypt + JWT) is Phase 2.

### Brief (table: `briefs`)
```python
id                  Integer, primary key
user_id             Integer, FK -> users.id (nullable in Phase 1)
company_name        String(255)
length              String(50), default="medium"
sections_requested  Text     # comma-separated e.g. "summary,news"
brief_json          Text     # stringified full JSON output
sources_used        Text     # JSON array string
generation_time_ms  Integer
limited_data        Boolean, default=False
created_at          DateTime(timezone=True)
```

---

## Agent Pipeline (agents.py)

Three sequential agents using CrewAI's `Process.sequential`:

### Agent 1 — Company Researcher
- **Tools:** `company_web_search` (Tavily), `company_financial_data` (stub)
- **max_iter:** 8 (reduced from default to prevent Groq TPM overflow)
- **Task:** Search for latest news, financial signals, products, competitors. Run ONE search at a time sequentially. Return plain prose summary (200 words max, no markdown).
- **Why 200-word limit:** Groq's llama-4-scout hits `tool_use_failed` if the final response is too long after tool calls.

### Agent 2 — Strategic Analyst
- **Tools:** None (works only from Agent 1's output)
- **Task:** Synthesize research into section-by-section analysis. Produce only the sections requested by the user.

### Agent 3 — Brief Formatter
- **Tools:** None
- **Task:** Take Analyst's output and format it as strict JSON. Each section has `content` (array of strings), `confidence` ("high"|"medium"|"low"), `sources` (array of URLs).

### LLM Configuration
```python
from crewai import LLM

def get_llm():
    return LLM(
        model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
        api_key=Config.GROQ_API_KEY,
        temperature=0.3,
    )
```

**Note:** `from crewai.tools import tool` is the correct import for the `@tool` decorator in CrewAI 1.x.

### run_brief() function
```python
def run_brief(company_name: str, length: str, sections: list) -> dict:
    # builds crew, kicks off, parses JSON output
    # returns: {"brief": {...}, "sources_used": [...], "limited_data": bool}
```

### _extract_json() helper
Handles cases where the LLM wraps output in markdown fences (```json ... ```) — strips them and parses raw JSON. Falls back to regex extraction if clean parse fails.

---

## Tools (tools.py)

### company_web_search
```python
from crewai.tools import tool  # correct import for CrewAI 1.x

@tool("company_web_search")
def company_web_search(query: str) -> str:
    """Search for recent company information using Tavily."""
    client = TavilyClient(api_key=Config.TAVILY_API_KEY)
    results = client.search(query, max_results=3)
    # returns formatted string of results
```

### company_financial_data
Stub function — returns deterministic fake financial data based on hash of company name. Real API (Alpha Vantage) integration is planned for later phases.

---

## App Routes (Phase 1)

### GET /api/health
Returns `{"status": "ok"}`. Used to verify server is running.

### POST /api/brief
Body: `{"company_name": "Infosys", "length": "short|medium|long", "sections": ["summary", "news", ...]}`

Valid sections: `summary`, `news`, `financials`, `social_sentiment`, `talking_points`, `watch_out_for`

Flow:
1. Validate inputs
2. `get_or_create_demo_user()` — creates/fetches `demo@pitchpulse.dev` user (Phase 1 only, replaced in Phase 2)
3. `check_rate_limit(user)` — 3/hr for free tier, resets hourly
4. `Config.validate()` — checks env vars
5. `run_brief(company_name, length, sections)` — runs agents
6. Saves brief to DB
7. Returns `{"brief": {...}, "sources_used": [...], "generation_time_ms": 18075, "limited_data": false}`

---

## Rate Limiting (Phase 1)

- Free tier: 3 briefs per hour
- `get_or_create_demo_user()` fetches or creates the demo user
- `check_rate_limit(user)` checks `briefs_used_this_hour` against limit
- Window resets when `hour_window_start` is > 1hr ago
- Returns 429 if over limit
- **Phase 2 replaces this with real per-user limits via JWT auth**

---

## Bugs Found & Fixed in Phase 1

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Port 5000 returns 403 from AirTunes | macOS AirPlay Receiver hijacks port 5000 | Changed to port 5001 in `app.run(debug=True, port=5001)` |
| `no such table: users` | Circular import — `db.create_all()` ran before models registered | Added `import models` inside `init_db()` function body (after `db.init_app(app)`) |
| `cannot import name 'tool' from 'crewai'` | CrewAI 1.x moved `@tool` to `crewai.tools` submodule | Changed to `from crewai.tools import tool` |
| `LiteLLM fallback not installed` | CrewAI 1.x needs litellm for Groq via `groq/` prefix | `pip install litellm` separately |
| `crewai==0.70.0` doesn't exist | CrewAI jumped from 0.x to 1.x versioning | Pinned to `crewai==1.14.4` |
| `python-dotenv==1.0.1` conflict | CrewAI 1.x requires `>=1.2.2` | Changed to `python-dotenv>=1.2.2` |
| `datetime.utcnow()` deprecation warning | Deprecated since Python 3.12 | Replaced with `datetime.now(UTC)` throughout app.py |
| `from config import config` (lowercase) | Config class is `Config` not `config` | Fixed to `from config import Config` in tools.py and agents.py |

---

## Confirmed Working Test

```bash
curl -X POST http://localhost:5001/api/brief \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Infosys", "length": "short", "sections": ["summary", "news"]}' \
  --max-time 120
```

Returns:
```json
{
  "brief": {
    "news": {
      "confidence": "high",
      "content": ["Infosys was named a Leader in the 2025 Gartner Magic Quadrant..."],
      "sources": ["https://www.infosys.com/newsroom/press-releases.html", ...]
    },
    "summary": {
      "confidence": "high",
      "content": ["Infosys is a global leader in digital services..."],
      "sources": [...]
    }
  },
  "generation_time_ms": 18075,
  "limited_data": false,
  "sources_used": [...]
}
```

---

## Local Dev Setup

```bash
cd "/Users/sannidhidurgapavansriram/Sriram/My Edu/BITSOM Programs/Final_Project_Bitsom/PitchPulse/backend"
source venv/bin/activate
python app.py     # runs on :5001

# Health check
curl http://localhost:5001/api/health
```

Server logs `[DB] Tables created (or already exist).` on startup if everything is set up correctly.

SQLite DB location: `backend/instance/pitchpulse.db` (Flask creates the `instance/` folder automatically)

---

## What Phase 2 Covers (Next)

Phase 2 = authentication + real user management:
- `bcrypt` password hashing
- `PyJWT` tokens (24hr expiry, `Authorization: Bearer` header)
- `require_auth` decorator
- Register, login, me, change-password, delete-account routes
- Replace demo user with real per-user rate limiting
- Brief management routes (list, save, delete, feedback, share)
- Watchlist table + routes
- All tested with curl (no frontend yet)

---

*Last updated: Phase 1 complete. CrewAI agents working, Tavily search working, brief generation confirmed at ~18s for short briefs. Port 5001, SQLite at instance/pitchpulse.db. Ready for Phase 2.*
