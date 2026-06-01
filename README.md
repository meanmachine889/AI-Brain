# Agency AI Brain

An AI dashboard for digital agencies. It ingests a client's scattered activity
across **Slack, Jira, and Gmail**, embeds it into pgvector, and uses Gemini to:

- auto-summarize each client's status,
- answer natural-language questions over their activity (RAG), and
- proactively flag what needs attention (silent client, blocked, stale ticket).

## Monorepo layout

```
.
├── apps/
│   ├── api/    # FastAPI backend — the reusable HTTP API (see apps/api/README.md)
│   └── web/    # Next.js frontend (one consumer of the API)
└── infra/
    └── docker-compose.yml   # Postgres (pgvector) + Redis
```

### The backend is a standalone, reusable API

`apps/api` is self-contained and deploys on its own. **Any client app reuses it
by calling its HTTP API** — the web app does this today via `NEXT_PUBLIC_API_URL`,
and a future mobile/admin app would do the same. To allow a new app's origin, add
it to `CORS_ORIGINS` in `apps/api/.env` (comma-separated) — no code change.

So "reuse the same backend" = point the new app at the deployed API URL + a JWT.
Auth is a Bearer token from `/auth/login`; the full contract is at `/docs`.

## Run locally

```bash
# 1. infra
cd infra && docker compose up -d            # Postgres + Redis

# 2. backend (from apps/api) — see apps/api/README.md for details
cd apps/api
uv sync
uv run alembic upgrade head
uv run uvicorn main:app --reload             # API at :8000  (/docs for the contract)
uv run celery -A workers.celery_app worker --loglevel=info --pool=solo   # worker
uv run celery -A workers.celery_app beat --loglevel=info                 # scheduler

# 3. frontend (from apps/web)
cd apps/web
npm install
npm run dev                                  # web at :3000
```

Copy `apps/api/.env.example` → `apps/api/.env` and fill the keys
(Gemini, plus Slack/Jira/Google OAuth creds per integration).

## Architecture

Two programs sharing Postgres + Redis:

- **API (FastAPI)** — fast request/response for the frontend(s).
- **Workers (Celery)** — slow background jobs (ingest, embed, summarize, alerts),
  on a schedule (Celery Beat) or on demand.

See `apps/api/README.md` for the full backend architecture (sessions, the two
data flows, attribution models for container vs. signal-matched sources).

## Status

Slack, Jira, Gmail integrations live. Remaining: Google Drive, Calendar. See
`PROGRESS.md` for the build log.
