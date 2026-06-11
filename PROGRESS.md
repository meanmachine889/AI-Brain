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

#### Ask-bar quality + retrieval pass (later session)
- [x] **Context the model can actually use** (`ai/rag.py _format_chunk`): fold metadata
      into each chunk — Jira status/assignee(or "unassigned")/due/priority, Gmail from/subject,
      Slack channel/author — and tag every item with its timestamp `[source · YYYY-MM-DD HH:MM]`
      (Jira shown as "updated …", its true semantics). Lets answers say "unassigned", "due Fri",
      "on May 30".
- [x] **Prompt** (`ai/prompts.py`): detailed-not-padded; Markdown allowed (rendered in UI);
      tasks span ALL sources (Slack/email count, not just Jira); consistent two-part
      blocker/"Also at risk" structure; injects today's date; generic examples (removed
      hardcoded client data that could leak across clients).
- [x] **Transient-error resilience** (`ai/llm.py`): `_generate` retries Gemini 503/429 with
      backoff (was 500-ing the request -> UI "Something went wrong"); answer cap 600->900.
- [x] **Time-window retrieval** (`ai/timeframe.py`, **tested** `tests/test_timeframe.py`, 25):
      parse "last week / 2 weeks ago / in March / yesterday / between…" -> filter
      `source_timestamp` chronologically (cap 50); empty window short-circuits
      ("No activity during …"); `_DUE_RE` guard keeps due-date Qs on the semantic path.
- [x] **Hybrid time-decay re-ranking** (`ai/ranking.py`, **tested** `tests/test_ranking.py`, 7):
      replaces the flat semantic top-k that DROPPED tickets once a client had >k chunks
      (the "missing data" bug). `score = 0.6·similarity + 0.4·recency_decay(τ=10d)` over a
      bounded pool (60) from the vector index, with a **per-source cap (8)** so a chatty
      source can't evict high-signal items; final 16. Cost stays flat as history grows.
      Proven live: PrimeOne blocker Q went from 2 -> all 6 tickets in context.
- [x] pytest added (dev dep + `[tool.pytest.ini_options]`); 32 tests green.
- [x] Question bank for eval: `apps/api/pm-test-questions.md`.

**Done when:** Natural language Q&A works over ingested client data

---

### Step 12: Attention feed
- [x] `workers/alerts.py` — `check_all` task loops clients, runs `_check_client`
  - [x] client_silent: no activity 5+ days
  - [x] client_blocked: latest summary mentions blocked/waiting/stuck
  - [x] ticket_stale: coded but DORMANT until Jira ingestion (Step 13)
- [x] `_create_alert` dedupe: skip same unresolved type per client within 24h
  - [x] now **per-ticket** for ticket-scoped alerts (matches on `ticket_key`), so multiple
        stale/overdue tickets each get their own alert; also fixed a latent `scalar_one_or_none()`
        crash when >1 matching alert already existed
- [x] `GET /dashboard/alerts` (?resolved= &severity= filters), `PATCH /alerts/{id}/resolve`
- [x] Registered workers.alerts in celery include
- [x] Tested: both rules fire (backdated chunks for silent), dedupe, resolve, filters, cross-agency 404
- Note: left Acme chunks backdated ~6 days from testing (harmless)
- [x] **`deadline_approaching` rule** (later): Jira ticket due within 48h (or overdue) and not
      Done -> alert (high if overdue, else medium); reads `due_date` from metadata. Beat (daily
      8am) confirmed running -> check_all fires the rules end-to-end.

**Done when:** Alerts generated and queryable via API

---

### Step 13: Gmail integration — DONE
- [x] Google OAuth (gmail.readonly, access_type=offline -> refresh token); /gmail/connect + /google/callback
- [x] Token refresh (Google keeps same refresh_token); identifies mailbox via users/me/profile
- [x] SIGNAL-MATCHED (no container): query by client.domain + contact_emails (from:/to: + after:)
- [x] MIME body parsing: walk parts, prefer text/plain, strip HTML fallback, base64url decode
- [x] Dedupe by message id; embed; store with from/to/subject/thread_id metadata; summarize
- [x] Registered in celery include + beat (:15) + generic sync; frontend Connect Gmail (live)
- [x] Tested live: 3 emails matched by domain, bodies parsed, fused into summary
- [x] Added `contact_emails` field to Client (migration 403de93ef919, backfilled [])
- [x] Built Edit-client UI (closes the gap): edit name/domain/contact_emails/slack/jira via PATCH
- [x] Improved ASK prompt: answers now include ticket subjects/details, not just IDs
- NOTE: TEsting client now fuses slack(5)+jira(3)+gmail(3) — 3 sources in one brain

### Step 13b: Jira integration — DONE (OAuth 3LO)
- [x] OAuth 3LO (not API token — professional/multi-tenant): connect + callback, cloudid lookup, offline_access refresh token
- [x] Token refresh in worker (access tokens expire ~1h; Atlassian rotates refresh tokens)
- [x] Pull issues per client project (JQL updated>=-7d via /search/jql), ADF->text helper
- [x] Chunk: title+status+description+comments, embed, UPSERT (tickets change), status/assignee/priority metadata
- [x] Registered in celery include + beat (every 2h, :30); generic /integrations/sync fans out slack+jira
- [x] Frontend: Connect Jira button (generalized), jira_project_keys in add-client form
- [x] Tested live on real KAN project: 3 issues ingested, summary fused Slack+Jira (8 chunks),
      ticket_stale alert fired for KAN-2 (the dormant rule is now active)
- GAP FOUND: no edit-client UI (can't add Jira keys to an existing client) — patched via DB for test; TODO build it

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

**Working on:** Step 16 — Multi-user (Google auth + per-client members) is DONE
end-to-end (backend + frontend). Next up: Step 13c — Google Drive integration.
Security hardening (token encryption, erasure/cascade, Postgres RLS) is DONE and on
`main` — see [SECURITY.md](SECURITY.md) for findings/progress/roadmap.

**Privacy pass (2026-06-11) — DONE:** short-lived access tokens (60m) + refresh flow
(`/auth/refresh`); audit logging of client-data reads → owner-only **Activity page**
(`audit_logs` table, migration `f525f5929eea`, `core/audit.py`, `routers/activity.py`,
`/clients/[id]/activity`); prompt-injection hardening (fenced untrusted content +
`_sanitize_chunk` in `ai/llm.py`); OAuth callbacks use `FRONTEND_URL`. Email-body
data-minimization intentionally NOT done (full bodies kept for RAG quality). See
[SECURITY.md](SECURITY.md) §3 + the updated prod checklist (Gemini paid-tier, DPA,
rate-limiting, HSTS).

---

### Step 16: Multi-user — Google auth + per-client members

**Model:** Agency = tenant. Every person is a `Member` of one agency (one email →
one agency). The **owner** is a Member with `is_owner=true` (sees all clients). Other
members get access **per client** via `ClientMember` (role `admin`|`viewer`) and carry
an agency-wide free-text `tag` (e.g. "Designer"). Auth is **Google sign-in** for
everyone (no passwords); we still mint our own session JWT with `token_version` so
logout/revocation works. Invites are per-client, owner-only.

Permissions: owner = everything; client `admin` = edit that client's config/source
mapping (channels, Jira keys, domain, contacts); `viewer` = read/ask/resolve only.
OAuth connections (Slack/Gmail/Jira) stay **owner-only** (single shared workspace).

Backend: ✅ DONE (verified end-to-end, 13/13 flow checks + 25 unit tests pass)
- [x] 16.1 Data model: Agency→tenant (drop email/password_hash); add `Member`,
      `ClientMember`, `ClientInvite`
- [x] 16.2 Migration + backfill an owner `Member` per existing agency + `app_user`
      grants on the new tables (migration `c3d4e5f6a7b8`)
- [x] 16.3 Session auth: verify Google ID token, mint session JWT w/ `token_version`,
      `set_principal_context` (agency + member GUC for RLS). NOTE: GUC is re-applied
      on every `after_begin` (a session-level GUC does NOT survive commit) — see
      `db/session.py:_apply_rls_guc`
- [x] 16.4 Auth endpoints: `/auth/google` (resolve: owner/member/invited/new),
      `/auth/create-agency`, invite preview + `/auth/accept-invite`, `/auth/logout`,
      `/auth/me`. Pre-auth endpoints run on `get_owner_db` (bypass RLS, enforce own checks)
- [x] 16.5 `get_current_member` + `get_current_agency` (derived) + `require_owner`
- [x] 16.6 Member/invite endpoints (`/clients/{id}/members`, `/clients/{id}/invites`)
      — owner-gated (`routers/members.py`)
- [x] 16.7 Role checks on writes (client create/delete owner-only; config edit
      owner/admin; integrations owner-only)
- [x] 16.8 RLS: member-context policies (per-client visibility for members;
      integrations owner-only) — migration `d4e5f6a7b8c9`
- [x] 16.9 Verified: full Google→onboarding→invite→accept→RLS-isolation→role→logout flow

Frontend: ✅ DONE
- [x] 16.10 Google Sign-In (`components/google-signin.tsx`, Google Identity Services) replaces
      password login; `lib/api.ts` `logout()` POSTs `/auth/logout` then clears the token; the
      account block reads the `Principal` from `/auth/me`.
- [x] 16.11 Onboarding: new users get an inline "create your agency" step on `/login` (surfaces any
      pending invites); `/accept-invite?token=` previews agency/client/role then accepts via Google.
- [x] 16.12 Owner-only Members panel per client (`/clients/[id]/members`): list with role + tag,
      invite (copies link), change role, remove, revoke pending invites. Sidebar "Members" entry +
      "Manage integrations" are gated on `is_owner`; 403s are surfaced (not logged out).
- See [apps/web/FRONTEND.md](apps/web/FRONTEND.md) for the full current frontend map.
- Needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (reuse backend `GOOGLE_CLIENT_ID`; JS origin
  `http://localhost:3000` already authorized in the Google Cloud console).

**Premium (future, documented):** multiple Slack/Jira workspaces — per-client
integrations gated by `Agency.plan`. Forward-compatible: relax `Integration`
uniqueness + let a client reference its own connection; current single-workspace data
stays valid. Not built now.

**Done when:** owner signs up with Google + creates clients; owner invites a member to
a client; member logs in, accepts, and sees only their client(s) with the right role.

---

## Phase 2 — Push intelligence (Weeks 8–16)
*Start after Phase 1 MVP is live with paying customers*
- [x] Alert when client goes silent beyond X days (`client_silent`, 5+ days — Step 12)
- [x] Alert when deadline approaches (`deadline_approaching` — Jira due ≤48h/overdue & not Done — Step 12)
- [ ] Weekly auto-draft of client status emails
- [ ] Handoff brief generator when team members change

## Phase 3 — Closed loop (Month 4+)
- [ ] Invoicing integration (Zoho Books / Freshbooks) — flag scope creep
- [ ] Meeting notes ingestion linked to client record
- [ ] Client health score across all accounts
