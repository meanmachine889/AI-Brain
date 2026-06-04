# Security — Findings, Progress & Roadmap

> Working security doc for **Agency AI Brain**. Written to be self-contained so a
> fresh session (or new engineer) can pick up exactly where we left off.
> Last updated: 2026-06-03. Branch: `security/encrypt-tokens-and-erasure`,
> first hardening commit: `a1630ec`.

---

## 1. Why this app needs a higher security bar

Agency AI Brain ingests **other people's private communications** — Slack messages
(incl. private channels via `groups:history`), full Gmail message bodies, and Jira
tickets/comments — for multiple agencies (multi-tenant SaaS). It stores:

- **OAuth tokens** per integration (Slack bot token, Gmail refresh token with
  `gmail.readonly` = full mailbox, Jira 3LO access+refresh tokens).
- **Raw personal content** verbatim in `data_chunks.content` + vector embeddings.
- Derived **summaries** and **alerts**.

It sends all ingested content to a **third party (Google Gemini)** for embeddings
and summarization.

So the realistic threats are: DB/backup leak, SQL injection, read-replica exposure,
insider access, a single forgotten tenant filter, and stolen/over-broad tokens. The
controls below are aimed at those.

Stack reference: FastAPI + async SQLAlchemy + Postgres/pgvector + Celery + Gemini.
Key files: `apps/api/db/models.py`, `apps/api/routers/integrations.py`,
`apps/api/core/`, `apps/api/workers/ingestion/`.

---

## 2. Status at a glance

| # | Item | Severity | Status |
|---|------|----------|--------|
| 1 | OAuth tokens encrypted at rest | High | ✅ Done (`a1630ec`) |
| 2 | Right-to-erasure / cascade delete | High | ✅ Done (`a1630ec`) |
| — | Revoke token + purge source on disconnect | High | ✅ Done (`a1630ec`) |
| 7 | Stop leaking provider error bodies to client | Medium | ✅ Done (`a1630ec`) |
| 5a | Separate OAuth-state signing secret | Medium | ✅ Done (`a1630ec`) |
| — | Untrack/gitignore `celerybeat-schedule.db` | Low | ✅ Done (`a1630ec`) |
| 6 | Postgres Row-Level Security (tenant isolation defense-in-depth) | Medium | ✅ Done |
| 5b | JWT revocation + shorter expiry | Medium | ☐ Open |
| 4 | Over-broad Gmail token (mitigated by #1; no scope fix possible) | Medium | ◐ Mitigated |
| — | Config-drive hardcoded `localhost:3000` OAuth redirects | Low | ☐ Open |
| — | Audit logging (who read which client's data) | Low | ☐ Open |
| — | Prompt-injection hardening (latent until LLM gets tools) | Low | ☐ Open |
| — | Data minimization (truncate stored email bodies) | Low | ☐ Open |
| 3 | Third-party (Gemini) data egress — DPA/consent | Compliance | ☐ Open (ops/legal) |
| — | DB-at-rest encryption (RDS/Cloud SQL) | Ops | ☐ Open (ops) |
| — | Fresh prod `TOKEN_ENCRYPTION_KEYS` from secrets manager | Ops | ☐ Open (ops) |

Numbering (#1, #5a, …) matches the original assessment for traceability.

---

## 3. Completed work (detail)

### #1 — OAuth tokens encrypted at rest ✅

**Problem.** `integrations.access_token` / `refresh_token` were stored in plaintext
(`xoxb-…`, `ya29.…`). Anyone with DB read access (backup leak, SQLi, replica,
insider) could read every connected client's inbox/chats without touching the app.
The model literally carried `# encrypt at rest in prod`.

**Fix (application-layer authenticated encryption at the ORM boundary):**
- `apps/api/core/crypto.py` — `encrypt()`/`decrypt()` using **MultiFernet**
  (Fernet = AES-128-CBC + HMAC, authenticated). Key(s) come from
  `TOKEN_ENCRYPTION_KEYS` env (comma-separated, **newest first**). Ciphertext is
  tagged with a `v1:` version prefix so we can migrate the scheme later (e.g. to
  KMS) gradually. `decrypt()` passes through non-prefixed legacy plaintext for
  safety during/after backfill.
- `apps/api/db/types.py` — `EncryptedString` SQLAlchemy `TypeDecorator`. Encryption
  happens transparently at the column boundary, so **all 12 read/write sites in
  workers/routers were untouched**.
- `apps/api/db/models.py` — `access_token`/`refresh_token` now use
  `EncryptedString`.
- `apps/api/core/config.py` — `token_encryption_keys` setting +
  `token_encryption_key_list` property.
- Migration `apps/api/alembic/versions/a1b2c3d4e5f6_*.py` — backfills existing
  plaintext rows to ciphertext (idempotent via the `v1:` check).

**Threat model after.** A DB-only breach yields useless ciphertext because the key
lives outside the DB (env / secrets manager). A *full* host+DB compromise still
loses the tokens — that's the gap KMS-per-request-decrypt would close later (see
roadmap / decisions).

**Verified.** DB now stores `v1:gAAAA…`; ORM reads back `xoxb-…`; crypto
round-trips; legacy plaintext passes through.

### #2 — Right-to-erasure / cascade delete ✅

**Problem.** `data_chunks`, `summaries`, `alerts` referenced `clients.id` with **no
`ON DELETE` rule and no ORM cascade**. Two consequences: (a) `DELETE /clients/{id}`
*failed with a FK violation* the moment a client had data — you literally could not
delete a client's personal data; (b) no erasure path for GDPR Art. 17.

**Fix.**
- `apps/api/db/models.py` — `ON DELETE CASCADE` on all client/agency FKs
  (`clients.agency_id`, `integrations.agency_id`, `data_chunks.client_id`,
  `summaries.client_id`, `alerts.client_id`) + matching ORM
  `cascade="all, delete-orphan"` relationships. (Also removed duplicate
  `email`/`plan` columns that were accidentally declared twice on `Agency`.)
- Migration `a1b2c3d4e5f6_*.py` drops & recreates the FK constraints with cascade
  (default Postgres FK names, e.g. `data_chunks_client_id_fkey`).

**Verified.** All five FKs report `confdeltype = 'c'` (CASCADE). Deleting a client
in a rolled-back transaction purged its chunks/summaries/alerts (1 → 0). Real data
untouched. 25 tests pass.

### Revoke token + purge source on disconnect ✅

**Problem.** `DELETE /integrations/{provider}` only dropped our stored token row.
The token stayed alive at the provider (Gmail refresh tokens ~never expire), so a
leaked copy kept working; and the ingested chats were retained after disconnect.

**Fix.** `apps/api/routers/integrations.py` `delete_integration` now:
1. **Best-effort revoke** at the provider — Slack `auth.revoke`, Google `/revoke`.
   (Atlassian/Jira has no public OAuth revoke endpoint; its access tokens expire in
   ~1h. Revoke failures never block disconnect.)
2. **Purge** that source's `data_chunks` for the agency's clients.
3. Delete the stored token row.

### #7 — Stop leaking provider error bodies ✅

`integrations.py` previously did `detail=f"...failed: {token_resp.text}"`, echoing
Google/Atlassian raw responses to the browser. Now logs server-side via
`logging.getLogger(__name__)` and returns a generic message.

### #5a — Separate OAuth-state signing secret ✅

**Problem.** The *same* `jwt_secret` signed both login tokens and OAuth `state`. A
leak of one signing key forged the other.

**Fix.** `apps/api/core/config.py` adds `oauth_state_secret` +
`oauth_state_signing_key` property (falls back to `jwt_secret` if unset).
`integrations.py` `_make_state`/`_read_state` now use the OAuth-state key.

**Verified.** State round-trips with the new key; the two secrets are distinct; a
state forged with `jwt_secret` is now **rejected** — proving real separation.

### Hygiene ✅

`celerybeat-schedule.db` (binary that rewrote itself every beat run) untracked via
`git rm --cached` and added to `.gitignore` (`celerybeat-schedule*`).

---

## 4. Remaining work (detail + recommended approach)

### #6 — Postgres Row-Level Security  ✅ (in working tree, not yet committed)

**Problem.** Tenant isolation was app-enforced only. Helpers like `_latest_summary`
and the RAG `ask()` filtered by `client_id` alone and were safe only because callers
ran the agency gate first — one future endpoint forgetting it would leak another
agency's data, with nothing in the DB to stop it.

**Fix (fail-closed at the database).** Two DB roles + RLS:
- The table **owner** (`agency`) bypasses RLS — used by Celery workers (cross-tenant
  by design) and Alembic.
- A restricted login role **`app_user`** is used by the API request path and IS
  subject to RLS. `apps/api/db/session.py` now has a second engine/session
  (`app_session`) bound to `APP_DATABASE_URL`; `get_db` (the request dependency)
  uses it, while workers keep `async_session` on the owner URL.
- Each request sets `app.current_agency_id` via `set_agency_context()` — called in
  `get_current_agency` (all authed endpoints) and in the 3 OAuth callbacks (which
  authenticate via signed state, not the bearer dep).
- Migration `b2c3d4e5f6a7_*.py` creates `app_user` (idempotent — skipped if it
  already exists, so a prod-provisioned password is preserved), grants it CRUD,
  and enables RLS + `FOR ALL` policies (USING + WITH CHECK) on the 5 tenant tables.
  `clients`/`integrations` scope by `agency_id`; `data_chunks`/`summaries`/`alerts`
  scope via their client's agency. `agencies` is intentionally **not** under RLS
  (login/register query it before any context exists).

**Verified (as `app_user`).** No context → 0 rows (fail closed); context=A → only A's
rows, 0 of B's; context=B → only B's; inserting a row for another agency is rejected
by WITH CHECK. End-to-end through the API: login, `/clients`, `/dashboard`, and RAG
`/ask` all scope correctly on the restricted role. 25 tests pass.

**Prod note:** provision `app_user` with a strong password from your secrets manager
and set `APP_DATABASE_URL` to it. If `APP_DATABASE_URL` is blank, the API connects as
owner and RLS is bypassed (dev fallback).

### #5b — JWT revocation + shorter expiry  (Medium)
Tokens currently last **7 days** (`ACCESS_TOKEN_EXPIRE_DAYS` in
`apps/api/core/security.py`) with **no revocation** — a stolen token is valid for a
week with no kill switch.
**Approach:** add a `token_version` int column to `Agency`; embed it in the JWT
payload; reject tokens whose version != current in `get_current_agency`. Bumping the
version (logout-all / suspected compromise) invalidates outstanding tokens. Consider
shortening access tokens (e.g. 60 min) + a refresh-token flow.
**Effort:** medium (touches auth + login flow + a migration).

### #6 — Postgres Row-Level Security  (Medium)
Tenant isolation is currently **app-enforced**: every query filters `agency_id`
(applied consistently today — `_get_owned_client`, integration/chunk queries). But
one forgotten filter in a future endpoint leaks another agency's private mail.
**Approach:** enable RLS on tenant tables; set a per-request
`SET LOCAL app.current_agency_id = …` in the DB session dependency
(`apps/api/db/session.py`); add policies `USING (agency_id = current_setting(...))`.
For `data_chunks`/`summaries`/`alerts` (scoped via `client_id`), policy joins to
`clients`. Makes a missed filter fail closed.
**Effort:** larger / architectural — touches session setup and every tenant table;
needs care with the Celery workers (they act cross-tenant and would need a
bypass/role).

### Config-drive OAuth redirect URLs  (Low, quick)
Three `RedirectResponse("http://localhost:3000/...")` are hardcoded in
`integrations.py` (slack/jira/google callbacks). Move to a `frontend_url` setting.
Prod footgun otherwise. **Effort:** ~10 min.

### Audit logging  (Low)
No record of which user viewed/asked-about which client's data. Expected for a tool
holding third-party inboxes. **Approach:** append-only audit table or structured log
on the read paths (`GET /clients/{id}`, `POST /clients/{id}/ask`, summary/dashboard).

### Prompt-injection hardening  (Low / latent)
Ingested emails/messages flow into the summarizer/RAG prompts
(`apps/api/ai/prompts.py`, `ai/rag.py`, `ai/llm.py`). Harmless today (output is only
shown to a PM). Becomes real if the LLM is ever given tools/actions — then a
malicious email could drive them. Revisit before adding agentic capabilities.

### Data minimization  (Low)
Full email bodies are stored verbatim (`workers/ingestion/gmail.py` →
`data_chunks.content`). Could truncate/snippet to reduce the standing pool of
personal data, trading some RAG quality. **Decision pending.**

### #3 — Third-party data egress (Gemini)  (Compliance, not code)
Every chunk of clients' private comms is sent to Google's API for embedding +
summarization. Need: client consent, a DPA with Google, and confirmation the API
tier does not train on the data. **Owner: ops/legal.**

---

## 5. Production deployment checklist (ops, before real client data)

- [ ] **Generate a fresh `TOKEN_ENCRYPTION_KEYS`** for prod and inject from a
      secrets manager (AWS Secrets Manager / GCP Secret Manager / Doppler / Vault).
      The dev key in `.env` is throwaway. **If this key is lost, encrypted tokens
      are unrecoverable** — users would just have to reconnect.
- [ ] **Set a distinct `OAUTH_STATE_SECRET`** and a strong `JWT_SECRET` (not
      `change_me`).
- [ ] **Provision the `app_user` DB role with a strong password** (secrets manager)
      and point `APP_DATABASE_URL` at it. If left blank, the API connects as the
      table owner and **RLS is bypassed**. Keep workers/Alembic on `DATABASE_URL`.
- [ ] **Enable DB-at-rest encryption** (RDS/Cloud SQL) as the second layer that
      protects `data_chunks.content` (which we deliberately do *not* app-encrypt —
      see decisions).
- [ ] Set `CORS_ORIGINS` to real frontend origins only (no wildcards).
- [ ] Confirm `.env` is never committed (it's gitignored; only `.env.example` is
      tracked).
- [ ] DPA with Google for Gemini; client consent for ingesting their comms.
- [ ] Decide retention policy (see decisions) and, if wanted, build the optional
      per-agency `retention_days` timer.

---

## 6. Key rotation runbook (`TOKEN_ENCRYPTION_KEYS`)

Keys are comma-separated, **newest first**. MultiFernet encrypts with the first key
and can decrypt with any listed key.

1. Generate a new key:
   `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
2. **Prepend** it: `TOKEN_ENCRYPTION_KEYS=<new>,<old>` and deploy. New writes use
   `<new>`; old ciphertext still decrypts with `<old>`.
3. Re-encrypt existing rows with the new key (one-off: read each integration token
   via the ORM and write it back, which re-encrypts with the first key; or a small
   `MultiFernet.rotate` script).
4. Once all rows are on the new key, **drop the old key**:
   `TOKEN_ENCRYPTION_KEYS=<new>` and deploy.

---

## 7. Verify / test commands

```bash
cd apps/api

# crypto round-trip
uv run python -c "from core.crypto import encrypt, decrypt; \
  ct=encrypt('x'); print(ct[:6], decrypt(ct)=='x')"

# tokens are ciphertext in the DB (raw) but plaintext via the ORM
docker exec infra-postgres-1 psql -U agency -d agency_brain -tA \
  -c "select provider, left(access_token,6) from integrations;"   # -> v1:...

# FK cascade rules ('c' = CASCADE on all five)
docker exec infra-postgres-1 psql -U agency -d agency_brain -tA \
  -c "select conrelid::regclass, confdeltype from pg_constraint where contype='f';"

# full suite
uv run pytest -q
```

Infra: `docker compose -f infra/docker-compose.yml up -d` (Postgres + Redis);
migrations: `uv run alembic upgrade head`.

---

## 8. Decisions log (why things are the way they are)

- **App-layer encryption only for tokens, not for `data_chunks.content`/embeddings.**
  Vector search (HNSW) needs embeddings queryable and content is read constantly;
  app-encrypting them breaks search/perf. Content is instead protected by
  DB-at-rest encryption + retention + tenant isolation + access logging.
- **Env-var key now, KMS-ready (not full KMS yet).** Chosen for the project's stage;
  `v1:` ciphertext prefix leaves a clean upgrade path to KMS envelope encryption
  with no schema change. (User decision.)
- **Retention = "keep until the client is deleted", no blanket time-based
  auto-delete.** The product's value is the long memory of a client relationship;
  auto-purging active history would hurt it. GDPR storage-limitation is satisfied by
  deleting when the engagement ends (cascade delete). An optional, default-off
  per-agency `retention_days` timer is left as a future hook. (User decision.)
- **Revoke-on-disconnect included** despite being optional — small code, kills
  leaked token copies. (User decision.)
- **`oauth_state_secret` falls back to `jwt_secret`** if unset, so existing
  deployments don't break; prod sets it explicitly.

---

## 9. What was committed vs. left uncommitted

Commit `a1630ec` on `security/encrypt-tokens-and-erasure` contains **only** the
security work: `core/crypto.py`, `db/types.py`, the migration, `core/config.py`,
`db/models.py`, `routers/integrations.py`, `.env.example`, `.gitignore`,
`pyproject.toml`, `uv.lock` (the last two also carry pre-existing pytest dev-infra
that was entangled in the same files).

Left **uncommitted** (unrelated in-flight feature work): `ai/llm.py`, `ai/prompts.py`,
`ai/rag.py`, `ai/timeframe.py`, `workers/alerts.py`, `tests/`, `pm-test-questions.md`,
and all `apps/web/` changes.
