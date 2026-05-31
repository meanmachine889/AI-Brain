# Agency AI Brain — Backend (`apps/api`)

FastAPI backend that ingests an agency's Slack / Gmail / Jira / Drive activity,
embeds it into pgvector, and uses Claude to summarize each client, answer
questions (RAG), and raise attention alerts.

This README explains the architecture and how the pieces fit. For the
step-by-step build, see the plan docs in the repo root and `PROGRESS.md`.

---

## Big picture — two programs, one database

The backend is really **two programs that share one database**:

```
   PROGRAM A: The API server (FastAPI + uvicorn)
   - Answers HTTP requests from the frontend
   - Fast: request in -> response out
   - "Give me client X's summary", "ask this question"

   PROGRAM B: The workers (Celery)
   - Slow background jobs, on a schedule or on demand
   - "Pull 7 days of Slack, embed it, summarize it"
   - Nobody is waiting on an HTTP connection for these

   Both talk to:
     Postgres + pgvector  -> the shared "brain" (all stored data + vectors)
     Redis                -> the job queue between API and workers
```

**Why split it?** Pulling a Slack workspace and calling Claude can take 30+
seconds — too long to make a browser hang. So the API server hands slow work
to the workers via Redis and returns immediately. Workers write results to
Postgres in the background. Later, a quick API call just *reads* those
precomputed results.

- **Postgres + pgvector** — shared memory. Agencies, clients, ingested text
  chunks (with embedding vectors), summaries, alerts.
- **Redis** — the conveyor belt. The API drops a job ticket; a worker picks it up.

---

## How a FastAPI request flows

Example: the frontend calls `GET /clients`.

```
Browser --GET /clients (Authorization: Bearer <token>)--> uvicorn (:8000)
  -> FastAPI app (main.py)
     1. match URL to a route in routers/clients.py
     2. resolve the route's DEPENDENCIES first:
          get_db()            -> opens a DB session
          get_current_agency  -> decodes the JWT, loads the agency
     3. run the route function with those ready-made values
     4. function queries the DB, returns Python objects
     5. FastAPI serializes them to JSON
  -> 200 OK  [ {client...}, ... ]
```

Three FastAPI concepts:

- **App + routers.** One `app = FastAPI()` in `main.py`. Routes are grouped by
  topic into routers (`auth.py`, `clients.py`, ...) and included into the app.
  A route is a function with an HTTP-method decorator (`@router.get("/clients")`).
- **Dependency injection (`Depends`).** Routes *declare* what they need as
  parameters (`db = Depends(get_db)`, `agency = Depends(get_current_agency)`).
  FastAPI runs those functions first and injects the results — so every
  protected route gets a session + auth for free.
- **Pydantic models = validation + docs.** Request bodies are described by
  Pydantic classes; FastAPI validates incoming JSON automatically and generates
  the `/docs` page. `core/config.py`'s `Settings` is the same idea, sourced from
  `.env` instead of an HTTP body.

---

## Directory layout

```
apps/api/
├── .env                  # config VALUES + secrets (never committed)
├── main.py               # creates the FastAPI app, wires routers      [Step 3]
│
├── core/
│   ├── config.py         # reads .env into a typed Settings object
│   └── security.py       # JWT decode + get_current_agency dependency  [Step 4]
│
├── db/
│   ├── models.py         # the 6 tables, as SQLAlchemy classes
│   └── session.py        # engine + session factory + get_db
│
├── routers/              # HTTP endpoints, grouped by topic            [Steps 3-12]
│   ├── auth.py
│   ├── clients.py
│   ├── integrations.py
│   └── summaries.py
│
├── ai/                   # the intelligence — mostly pure functions    [Steps 7,9,11]
│   ├── embeddings.py     # text -> vector (OpenAI)
│   ├── claude.py         # call Claude for summaries / answers
│   ├── prompts.py        # prompt templates
│   └── rag.py            # vector search + Claude = Q&A
│
├── workers/              # Program B — background jobs                 [Steps 6,8,9,12,13]
│   ├── celery_app.py     # the Celery instance + beat schedule
│   ├── ingestion/        # one file per integration (slack, gmail, ...)
│   ├── summarizer.py
│   └── alerts.py
│
└── alembic/              # database migration history
```

---

## The database session (SQLAlchemy)

`db/session.py` has three layers:

```python
engine = create_async_engine(settings.database_url, ...)   # 1
async_session = async_sessionmaker(engine, ...)            # 2
async def get_db():                                        # 3
    async with async_session() as session:
        yield session
```

1. **Engine** — low-level connection manager; owns a pool of TCP connections to
   Postgres. Created once for the whole app. Never used directly in routes.
2. **Session factory** (`async_session`) — calling it returns one fresh Session.
3. **Session** — the workspace for one unit of work (one request, or one task).
   You run queries, add/modify objects, then `await db.commit()`. A session:
   - borrows one connection from the pool while open, returns it when done;
   - is a **transaction boundary** — nothing is saved until `commit()`, and an
     error rolls everything back (all-or-nothing);
   - **tracks your objects** — change `client.name` and commit, and it writes
     just that, no manual UPDATE.

`get_db` uses `yield` inside `async with` so FastAPI can "set up -> hand over ->
tear down": every request gets its own session, guaranteed-closed.

Two ways to get a session, both from the same factory:
- `get_db` — used by the **API** via `Depends(get_db)` (FastAPI manages it per request).
- `async_session` — used directly by **Celery workers**, which have no request:
  `async with async_session() as db: ...`

**Async**: DB calls mostly *wait* on the network, so `async`/`await` lets the
program do other work meanwhile. Hence `asyncpg`, `AsyncSession`, `async def`
routes, `await db.execute(...)`. Exception: Alembic migrations run sync, so
`alembic/env.py` swaps in the `psycopg2` driver just for migrations.

---

## Migrations (Alembic)

`db/models.py` describes what the schema *should* be. The real Postgres DB is a
separate living thing. Migrations are versioned scripts that evolve the real DB
to match the models (`CREATE TABLE` first, `ALTER TABLE` later). `Base.metadata`
is the registry Alembic reads to autogenerate them.

```bash
uv run alembic revision --autogenerate -m "message"   # generate from model changes
uv run alembic upgrade head                            # apply pending migrations
uv run alembic current                                 # show applied revision
```

The initial migration also hand-adds two things autogenerate can't infer:
`CREATE EXTENSION IF NOT EXISTS vector` (first, before any vector column) and
the HNSW index `data_chunks_embedding_idx` (for fast similarity search).

---

## The two end-to-end flows

**Flow A — Ingestion (background, Program B):** raw data -> searchable brain.

```
Celery Beat fires "ingest slack" every 2h -> drops a job on Redis
  -> worker runs workers/ingestion/slack.py (opens async_session)
     1. read Integration row -> Slack token
     2. call Slack API -> last 7 days of messages
     3. each message: ai/embeddings.py turns text -> 1536-dim vector
     4. db.add(DataChunk(content, embedding)); db.commit()
     5. trigger summarizer -> ai/claude.py writes a Summary row
  -> Postgres now holds DataChunks (text + vectors) + a fresh Summary
```

**Flow B — Reading / asking (foreground, Program A):** fast reads of what A produced.

```
Frontend -> POST /clients/{id}/ask { "question": "what's due Friday?" }
  -> routers/summaries.py route (got db + agency via Depends)
     calls ai/rag.py:
     1. embed the QUESTION into a vector
     2. pgvector finds the 5 most similar DataChunks for this client
        (the HNSW index makes this fast)
     3. feed chunks + question to Claude
     4. return answer + source chunks
  -> Frontend gets an answer in ~2-3s, because the heavy lifting
     already happened in Flow A.
```

**Core idea:** slow ingestion writes the brain in the background; fast reads
serve it instantly.

| Layer            | Files              | Program        | Sync/async        |
|------------------|--------------------|----------------|-------------------|
| Config           | `core/config.py`   | both           | —                 |
| Schema           | `db/models.py`     | both           | —                 |
| DB access        | `db/session.py`    | both           | async             |
| HTTP endpoints   | `routers/*`        | A (API)        | async             |
| Auth             | `core/security.py` | A              | async             |
| Intelligence     | `ai/*`             | both           | async             |
| Background jobs  | `workers/*`        | B (workers)    | async (asyncio)   |
| Migrations       | `alembic/*`        | tooling        | sync (psycopg2)   |

---

## Running locally

```bash
# infra (from repo root)
cd infra && docker compose up -d          # Postgres + Redis

# api (from apps/api)
uv sync                                    # install deps
uv run alembic upgrade head                # apply migrations
uv run uvicorn main:app --reload           # start the API  [Step 3+]
```
