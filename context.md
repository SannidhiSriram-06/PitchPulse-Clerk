# PitchPulse — Project Context

> **Last updated:** Phase 1 complete (backend only)  
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
│   ├── app.py               ← Flask app factory, all API routes, rate limiting logic
│   ├── agents.py            ← 3 CrewAI agents, their tasks, and run_brief() orchestrator
│   ├── tools.py             ← Tavily search tool + financial data stub (CrewAI tool wrappers)
│   ├── models.py            ← SQLAlchemy ORM models: User and Brief tables
│   ├── database.py          ← SQLAlchemy db instance, init_db() function
│   ├── config.py            ← Loads .env via dotenv, exposes Config class with all settings
│   ├── requirements.txt     ← Python dependencies (unpinned where needed for compatibility)
│   ├── .env                 ← Local secrets (NOT committed to Git)
│   ├── .env.example         ← Template showing required env var names, safe to commit
│   └── venv/                ← Python virtual environment (NOT committed to Git)
└── frontend/                ← Empty folder. React + Vite + Tailwind goes here in Phase 2.
```

---

## 3. Environment Variables

All loaded via `python-dotenv` from `backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | API key for Groq LLM inference. Get from console.groq.com |
| `TAVILY_API_KEY` | ✅ Yes | API key for Tavily web search. Get from app.tavily.com |
| `SECRET_KEY` | ✅ Yes | Flask session secret. Set to a long random string in prod |
| `DATABASE_URL` | Optional | SQLAlchemy DB connection string. Defaults to `sqlite:///pitchpulse.db` |
| `CREWAI_TRACING_ENABLED` | Optional | Set to `false` to suppress CrewAI's trace prompt on every run |

---

## 4. API Routes

### `GET /api/health`

**Purpose:** Liveness check.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /api/brief`

**Purpose:** Run 3 CrewAI agents and return a structured pre-meeting brief.

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
| `company_name` | string | ✅ | 2–200 chars |
| `length` | string | No (default: `"medium"`) | `"short"`, `"medium"`, `"long"` |
| `sections` | array of strings | No (default: all) | see valid sections below |

**Valid section values:**
`summary`, `news`, `financials`, `social_sentiment`, `talking_points`, `watch_out_for`

**Success response (200):**
```json
{
  "brief": {
    "summary": {
      "content": ["bullet 1", "bullet 2"],
      "confidence": "high",
      "sources": ["https://..."]
    },
    "news": {
      "content": ["bullet 1", "bullet 2"],
      "confidence": "high",
      "sources": ["https://..."]
    }
  },
  "sources_used": ["https://...", "https://..."],
  "generation_time_ms": 18075,
  "limited_data": false
}
```

Note: `content` is a list of bullet point strings when `length=short`, 
a paragraph string when `length=medium` or `long`.

**Error responses:**

| Code | Condition | Response body |
|---|---|---|
| 400 | Empty or missing company_name | `{ "error": "company_name is required." }` |
| 400 | Invalid or unknown company | `{ "error": "We couldn't find enough data..." }` |
| 400 | Invalid sections list | `{ "error": "No valid sections provided..." }` |
| 429 | Free tier hourly limit hit | `{ "error": "Rate limit reached. Upgrade to Pro for unlimited briefs." }` |
| 500 | Missing API keys | `{ "error": "Missing required environment variables: ..." }` |
| 500 | CrewAI agents failed | `{ "error": "Agent execution failed. Please try again.", "detail": "..." }` |

---

## 5. Database Schema

**Engine:** SQLite in development (`pitchpulse.db` created in `backend/`). Planned: PostgreSQL on Render.

### `users` table

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `email` | String(255), UNIQUE | User identifier |
| `tier` | String(50) | `"free"` or `"pro"`. Default: `"free"` |
| `briefs_used_this_hour` | Integer | Counter reset every 60 mins. Default: 0 |
| `hour_window_start` | DateTime | Timestamp when current window started (timezone-aware UTC) |
| `created_at` | DateTime | Row creation timestamp |

### `briefs` table

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → users.id) | Nullable until auth is built |
| `company_name` | String(255) | The queried company |
| `length` | String(50) | `"short"`, `"medium"`, or `"long"` |
| `sections_requested` | Text | Comma-separated list of requested sections |
| `brief_json` | Text | Full JSON blob of the generated brief |
| `sources_used` | Text | JSON array of source URLs |
| `generation_time_ms` | Integer | Time taken in milliseconds |
| `limited_data` | Boolean | True if fewer than 2 search results found |
| `created_at` | DateTime | Row creation timestamp |

---

## 6. Agent Descriptions

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

## 7. What Was Completed in Phase 1

- [x] Full backend folder structure
- [x] `config.py` with env loading and `validate()` 
- [x] `database.py` with SQLAlchemy + `init_db()` (fixed: `import models` inside `init_db` to force table registration before `create_all()`)
- [x] `models.py` with `User` and `Brief` ORM models
- [x] `tools.py` with Tavily search tool and financial stub (`from crewai.tools import tool`)
- [x] `agents.py` with 3 agents using `crewai.LLM` wrapper (not langchain-groq)
- [x] `app.py` with Flask factory, `/api/health`, `/api/brief`, rate limiting, error handling
- [x] `datetime.utcnow()` replaced with `datetime.now(UTC)` throughout (Python 3.12+ compatible)
- [x] Brief length options: short / medium / long
- [x] All briefs saved to SQLite
- [x] `requirements.txt` with working dependency set
- [x] End-to-end test passed: Infosys brief returned in ~18 seconds with real Tavily data

**Confirmed working curl:**
```bash
curl -X POST http://localhost:5001/api/brief \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Infosys", "length": "short", "sections": ["summary", "news"]}' \
  --max-time 120
```

**To run:**
```bash
cd PitchPulse/backend
source venv/bin/activate
python app.py
# Server runs on http://127.0.0.1:5001 (port 5000 is taken by macOS AirPlay)
```

---

## 8. What Is NOT Yet Built

- **Authentication:** No login/JWT. All requests use a hardcoded `demo@pitchpulse.dev` user.
- **Frontend:** `frontend/` folder is empty. Phase 2 = React + Vite + Tailwind.
- **Real financial data:** `company_financial_data` in `tools.py` returns stub data. Wire Alpha Vantage or FMP later.
- **Pro tier upgrade flow:** Tier field exists on User model. No payment integration.
- **Deployment:** Local only. Render + PostgreSQL planned for Phase 3.
- **CORS:** Not configured. Add `flask-cors` before Phase 2 frontend calls the backend.
- **Caching:** No caching. Same company re-runs all agents every time.

---

## 9. Decisions Made and Why

| Decision | Choice | Reason |
|---|---|---|
| LLM | Groq (llama-4-scout-17b-16e-instruct) | Fast inference, generous free tier |
| LLM wrapper | `crewai.LLM` with `groq/` prefix via LiteLLM | CrewAI 1.x dropped native langchain-groq support; requires litellm for Groq |
| Agent framework | CrewAI 1.14.4 | Multi-agent sequential pipelines, tool integration |
| Search | Tavily | Best structured output for AI agent search |
| Database (dev) | SQLite | Zero setup, file-based |
| Database (prod) | PostgreSQL (planned) | Render free tier, scales properly |
| Backend | Flask 3.0.3 | Lightweight, no overhead |
| Port | 5001 | Port 5000 hijacked by macOS AirPlay Receiver on Monterey+ |
| Tool import | `from crewai.tools import tool` | CrewAI 1.x location (not `from crewai import tool`) |

---

## 10. Known Issues / Watch Out For

1. **macOS AirPlay on port 5000:** Flask runs on 5001. Don't change it back to 5000 unless AirPlay Receiver is disabled in System Settings → General → AirDrop & Handoff.

2. **LiteLLM must be in the venv:** `pip install litellm` must run inside the activated venv, not the system Python (miniconda). Always `source venv/bin/activate` first.

3. **Circular import fix in database.py:** `import models` must be inside the `init_db()` function body, not at the top of the file. If moved to the top, `db.create_all()` runs before models are registered and tables won't be created.

4. **JSON parse fallback:** The briefing agent sometimes wraps output in markdown fences despite being told not to. `_extract_json()` in `agents.py` handles this with regex. If briefs start returning `parse_error: true`, check the `raw_output` field.

5. **CrewAI tracing prompt:** On first run, CrewAI asks interactively whether to enable tracing. Add `CREWAI_TRACING_ENABLED=false` to `.env` to suppress this permanently.

6. **Groq free tier TPM limits:** Rapid successive test requests may hit Groq's tokens-per-minute limit. Wait 30 seconds and retry if you get a 500 with a rate limit detail from Groq.

7. **CrewAI version sensitivity:** Pinned to `crewai==1.14.4`. The API changes frequently between minor versions. Don't upgrade without testing.

8. **SQLite concurrency:** Fine for Phase 1 single-user testing. Must migrate to PostgreSQL before any multi-user or production deployment.

9. **`verbose=True` on all agents:** Prints extensively to stdout. Set to `False` before deploying to production.