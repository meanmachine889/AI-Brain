# Agency AI Brain — Build Progress

> Update this file as you complete each step. Change `[ ]` to `[x]` when done.

---

## Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## Phase 1 — MVP (Weeks 1–8)

### Step 1: Local environment setup
- [x] Install Python 3.12 (via uv) — switched from Poetry to **uv**
- [x] Create `apps/api/`, init uv project
- [x] Install core dependencies (llama-index deferred to Step 13; added pyjwt)
- [x] Create `infra/docker-compose.yml` with Postgres 16 (pgvector) + Redis 7, healthchecks
- [x] `docker compose up` runs clean — both healthy
- [x] `.env` file created with placeholder keys

**Done when:** `docker compose up` runs clean, Python env ready

---

### Step 2: Database schema
- [x] `apps/api/db/models.py` — `Agency`, `Client`, `Integration`, `DataChunk` (pgvector), `Summary`, `Alert`
- [x] `apps/api/db/session.py` — async engine + session factory + `get_db`
- [x] `apps/api/core/config.py` — pydantic Settings (pulled forward from Step 3)
- [x] `alembic init`, env.py wired to models (sync psycopg2 driver for migrations)
- [x] Initial migration written and run (`e8a046fe7204`)
- [x] `CREATE EXTENSION IF NOT EXISTS vector` + HNSW index in migration

**Done when:** All tables exist in local Postgres, pgvector extension enabled

---

### Step 3: FastAPI app skeleton
- [x] `apps/api/main.py` — FastAPI app instance, routers registered, CORS, `/health`
- [x] Empty routers: `auth.py`, `clients.py`, `integrations.py`, `summaries.py`
- [x] `core/config.py` — pydantic settings loading env vars (done in Step 2)
- [ ] `core/security.py` — JWT decode helper (Step 4)
- [x] `uvicorn main:app --reload` runs, `/docs` loads

**Done when:** Server runs, `/docs` loads, all routers registered

---

### Step 4: Auth
- [x] Self-contained JWT auth (bcrypt + HS256) — chose this over Clerk/Supabase for local dev
- [x] `core/security.py` — hash/verify password, create_access_token, `get_current_agency`
- [x] Added `password_hash` column to Agency (migration `885b0b21eecb`)
- [x] `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- [x] `get_current_agency` dependency working
- [x] Tested full flow vs real server: register/login/me + 400/401/422 negatives all pass
- Notes: added `greenlet` (SQLAlchemy async needs it); declared HNSW index in model
  `__table_args__` so autogenerate stops trying to drop it

**Done when:** Register, login, and protected route all work

---

### Step 5: Client CRUD
- [x] `GET /clients` — list clients for current agency
- [x] `POST /clients` — create client (201)
- [x] `GET /clients/{id}` — get one client
- [x] `PATCH /clients/{id}` — partial update (exclude_unset), metadata->metadata_
- [x] `DELETE /clients/{id}` — delete client
- [x] Agency scoping enforced via `_get_owned_client` (filter id AND agency_id -> 404)
- [x] Tested: full CRUD + cross-agency isolation (B gets 404 on A's client, A intact)

**Done when:** Full CRUD works, agency scoping enforced

---

### Step 6: Celery setup
- [x] `workers/celery_app.py` — Celery + Redis broker/backend (minimal; include list grows in Step 8+)
- [x] `workers/tasks.py` — `hello` test task
- [x] Worker runs (use `--pool=solo` on macOS to avoid fork crashes)
- [x] Beat runs (idle — beat_schedule added in Step 14)
- [x] Test task triggered via `hello.delay()`, executed + returned in worker

**Done when:** Worker + beat run, test task executes successfully

---

### Step 7: Embeddings module
- [x] `ai/embeddings.py` — `embed_text` + `embed_batch`
- [x] Switched to **Gemini `gemini-embedding-001`** @ 1536-dim (output_dimensionality), L2-normalized
      - chose 1536 because pgvector HNSW index only supports <=2000 dims
      - task_type asymmetry: embed_text=RETRIEVAL_QUERY, embed_batch=RETRIEVAL_DOCUMENT
- [x] Live test: 1536-dim normalized vectors + semantic sanity (cat~kitten > cat~database)
- Notes: GOOGLE_API_KEY in .env (separate from GOOGLE_CLIENT_ID/SECRET OAuth creds)

**Done when:** `embed_text()` returns a valid float vector

---

### Step 8: Slack integration — ingestion
- [x] Slack app registered (test workspace "AI Brain"), 6 bot scopes + redirect URL
- [x] `GET /integrations/slack/connect` — returns signed-state OAuth URL (JSON, not 302, for backend testing)
- [x] `GET /integrations/slack/callback` — exchanges code for bot token, upserts Integration, triggers ingest
- [x] `POST /integrations/slack/sync` — manual re-ingest trigger; `GET /integrations`, `DELETE /{provider}`
- [x] `workers/ingestion/slack.py` — `ingest_for_agency` + `ingest_all_agencies` (@celery_app.task)
  - [x] Pulls last 7 days, filters real messages, dedupes by ts
  - [x] `embed_batch` via `_embed_all` (concurrent batches — perf, billing enabled)
  - [x] Stores DataChunk with embedding + metadata (channel, user, thread_ts)
- [x] Tested live: 5 chunks stored, all 1536-dim embeddings, names resolved, dedupe verified (2nd sync = 0 new)
- Fixes: added `aiohttp` (slack async client); **NullPool** in db/session.py (asyncio.run per
  Celery task = new loop each time → pooled asyncpg conns crashed "different loop")
- Deferred: summarizer trigger in slack.py is commented out until Step 9

**Done when:** Slack OAuth works, messages chunked + embedded + stored in pgvector

---

### Step 9: Summarizer (Gemini, not Claude)
- [x] `ai/prompts.py` — summarize + ask prompt templates
- [x] `ai/llm.py` — `summarize()` + `answer()` via **Gemini** (chose Gemini over Claude: one
      provider/key, billing already on). Model in `chat_model` config (gemini-2.5-flash, switchable)
      - thinking_budget=0 to disable 2.5-flash thinking (faster, avoids empty short outputs)
- [x] `workers/summarizer.py` — `summarize_client` task: latest 30 chunks -> Gemini -> Summary row
- [x] Summarizer auto-triggered after ingestion (uncommented in slack.py; registered in celery include)
- [x] Tested live on Acme: accurate 3-4 sentence status (in-progress / blocked / urgent) from 5 msgs
- Note: `claude_model` config var now unused; ANTHROPIC_API_KEY not needed

**Done when:** Summaries generated and stored after ingestion runs

---

### Step 10: Summaries API
- [x] `GET /clients/{id}/summary` — latest summary + is_stale/refreshing; if >2h old, enqueue refresh + return current
- [x] `GET /dashboard` — all clients w/ summary, last_activity_at, attention_score, alert_count; sorted desc
- [x] `_attention_score` partial: no-activity-7d (+40), summary "blocked"/"waiting" (+20), alerts (+10 cap 30)
      - deferred rules: outbound-silence-5d (need msg direction), stale Jira ticket (Step 13)
- [x] Tested: Acme summary, dashboard score=20, cross-agency empty dashboard + 404 on summary
- Note: /dashboard is N+1 (per-client queries) — fine at MVP scale

**Done when:** Frontend can fetch summaries for any client

---

### Step 11: Ask bar (RAG)
- [x] `ai/rag.py` — `ask(db, client_id, client_name, question)`
  - [x] Embeds question (RETRIEVAL_QUERY), pgvector `cosine_distance` top-5 (uses HNSW index)
  - [x] Builds context, calls `ai.llm.answer` (Gemini), returns answer + sources
- [x] `POST /clients/{id}/ask` in summaries.py (agency-scoped, 404 on other agency)
- [x] Tested live: blocked->brand pack, Friday->sign-off (both cited Slack), budget->"don't have that info" (no hallucination)
- [x] BONUS: fixed dashboard N+1 -> 4 batched queries (GROUP BY + DISTINCT ON), removed dead helpers

**Done when:** Natural language Q&A works over ingested client data

---

### Step 12: Attention feed
- [x] `workers/alerts.py` — `check_all` task loops clients, runs `_check_client`
  - [x] client_silent: no activity 5+ days
  - [x] client_blocked: latest summary mentions blocked/waiting/stuck
  - [x] ticket_stale: coded but DORMANT until Jira ingestion (Step 13)
- [x] `_create_alert` dedupe: skip same unresolved type per client within 24h
- [x] `GET /dashboard/alerts` (?resolved= &severity= filters), `PATCH /alerts/{id}/resolve`
- [x] Registered workers.alerts in celery include
- [x] Tested: both rules fire (backdated chunks for silent), dedupe, resolve, filters, cross-agency 404
- Note: left Acme chunks backdated ~6 days from testing (harmless)

**Done when:** Alerts generated and queryable via API

---

### Step 13: Gmail integration
- [ ] Google OAuth flow (same as Slack pattern)
- [ ] Pull emails where client domain appears in From/To
- [ ] Chunk email body, embed, store as `DataChunk`

### Step 13b: Jira integration
- [ ] Jira OAuth or API token
- [ ] Pull issues per client project
- [ ] Chunk: title + description + comments, embed, store
- [ ] Ticket status stored in chunk metadata (used by alert rules)

### Step 13c: Google Drive integration
- [ ] Google OAuth (extra Drive scope on same credentials as Gmail)
- [ ] Pull recently modified docs in client folders
- [ ] LlamaIndex parses PDF/Docs → chunk → embed → store

**Done when:** All 4 integrations feed into the same `DataChunk` table

---

### Step 14: Scheduler (Celery Beat)
- [x] `beat_schedule` in celery_app.py:
  - [x] `ingest-slack-every-2h` -> ingest_all_agencies, crontab(minute=0, hour="*/2")
  - [x] `alerts-daily-8am` -> check_all, crontab(minute=0, hour=8)
  - [ ] gmail/jira/drive entries deferred with Step 13
- [x] Tested: temp 10s interval -> beat auto-fired ingest_all_agencies -> ingest_for_agency ->
      summarize_client with NO manual trigger; reverted to 2h cron
- Run in prod: 1 beat process + 1+ worker process

**Done when:** Full ingestion + alert pipeline runs on schedule

---

### Step 15: Frontend (Next.js)
- [x] `apps/web/` — Next.js 16 (App Router, TS, Tailwind v4), React 19, Turbopack
- [x] shadcn/ui installed (button, card, input, badge, textarea, label, separator, skeleton, sonner)
- [x] `lib/api.ts` — fetch wrapper (Bearer from localStorage, 401/403 -> /login) + shared types
- [x] Login/register page (our JWT auth, not Clerk) -> stores token -> /dashboard
- [x] Integrations page — Connect Slack (OAuth handoff), Gmail/Jira/Drive "Soon"; callback -> /integrations?connected=slack
- [x] Dashboard — client cards (score chip, summary, last activity), alerts feed w/ resolve, add-client form
- [x] Client detail — summary card + Sync now + ask bar with grounded answer + sources
- [x] `npm run build` clean (TS passes, all routes compile); dev server serves all pages 200
- Stack runs: docker (pg+redis) + uvicorn :8000 + celery worker + next dev :3000
- Seeded login to see real data: slacktest_1780219957@acme.com / test1234 (owns Acme + Slack)

**Done when:** Full UI works end to end with real connected data

---

## Current step
> Update this line as you move through the build.

**Working on:** Step 15 — Frontend (Next.js). Step 13 (Gmail/Jira/Drive) DEFERRED —
full flow with Slack first; other integrations are the same pattern, added later.

---

## Phase 2 — Push intelligence (Weeks 8–16)
*Start after Phase 1 MVP is live with paying customers*
- [ ] Alert when client goes silent beyond X days
- [ ] Alert when deadline approaches with no ticket activity
- [ ] Weekly auto-draft of client status emails
- [ ] Handoff brief generator when team members change

## Phase 3 — Closed loop (Month 4+)
- [ ] Invoicing integration (Zoho Books / Freshbooks) — flag scope creep
- [ ] Meeting notes ingestion linked to client record
- [ ] Client health score across all accounts
