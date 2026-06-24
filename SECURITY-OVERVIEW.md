# Security & Privacy Overview

*For agencies evaluating Agency AI Brain. A plain-language summary of how we
protect your clients' data. (Engineering detail lives in `SECURITY.md`.)*

---

## What this tool holds — and why we take it seriously

Agency AI Brain reads your clients' activity across **Slack, Gmail, and Jira** so
your team can get instant context. That means we handle sensitive material:
private messages, full email bodies, and ticket history. We've built the product
around the assumption that **this data deserves a higher bar than a typical SaaS
dashboard**. Here's how we protect it.

---

## Your data is isolated from every other agency

- **Enforced at the database, not just in our code.** Each agency's data is
  walled off by **Postgres Row-Level Security** — a rule the database itself
  enforces on every query. Even if our application code had a bug, the database
  would still refuse to return another agency's data. This is *defense in depth*:
  two independent layers have to fail for any cross-agency leak.
- **One sign-in, one agency.** A user account belongs to exactly one agency and
  cannot be pulled into another.

## Access is controlled and least-privilege

- **Google sign-in only** — no passwords for us to store or leak. We mint a
  short-lived session that you can revoke instantly.
- **Per-client access.** The agency owner decides which team members can see
  which clients, as **admin** (can edit) or **viewer** (read-only). A designer
  added to one client cannot see your other clients.
- **Short-lived sessions with instant revocation.** Access tokens expire in
  **60 minutes**; signing a user out (or a "log out everywhere" action)
  invalidates their tokens immediately, so a stolen session is useful for minutes,
  not days.
- **Brute-force protection.** Sign-in and invite endpoints are rate-limited to
  stop automated guessing and credential-stuffing.

## A complete audit trail — you can see who looked at what

Every time someone on your team views a client, asks a question about a client, or
opens the dashboard, we record **who, which client, and when** (questions asked are
logged too). The agency owner has a dedicated **Activity page** to review this. If
a privacy-conscious customer ever asks "who on our team accessed this account's
data?", you have an exact answer.

## Sensitive credentials are encrypted

The access tokens that connect to your Slack/Gmail/Jira are **encrypted at rest**
with authenticated encryption, and the encryption key lives **outside the
database**. A database backup or leak yields unreadable ciphertext, not working
credentials. When you disconnect an integration, we **revoke the token at the
provider** and **purge the data** we pulled from it.

## You can delete a client's data completely

Disconnecting or deleting a client **cascades** — every message, email, summary,
and alert we stored for them is removed. This is how we satisfy
**right-to-erasure** (e.g. GDPR Article 17) when an engagement ends.

## Hardened against malicious content

Because we ingest real inboxes and channels, content could contain attempts to
manipulate the AI ("ignore your instructions and…"). We treat all ingested content
as **untrusted data, never instructions**, and fence it so it cannot steer the
assistant or cross between clients.

## How AI processing works (and the one place data leaves)

To produce summaries and answer questions, content is sent to **Google's Gemini
API** for processing. This is the one external dependency, and we're transparent
about it:

- On a **paid Google Cloud tier, Google does not use your data to train models.**
  We run on the paid tier (not the free consumer tier).
- For agencies that need stricter guarantees, we can run on **Google Vertex AI**,
  which offers enterprise data governance and configurable/zero data retention with
  the same models.
- A **Data Processing Agreement** is available; Google is a named sub-processor.

> Considering a deployment where **no third-party AI** is involved at all? We have a
> roadmap option to run the AI fully locally (self-hosted models). Ask us.

## You can run it in your own cloud

The platform is **self-hostable** — the entire stack runs in your own
infrastructure if you'd prefer your clients' data never sit on shared
infrastructure. Talk to us about a private deployment.

---

## At a glance

| Concern | Our control |
|---|---|
| Another agency seeing our data | Database-enforced Row-Level Security (defense in depth) |
| Internal team access | Per-client roles (admin/viewer), owner-controlled |
| "Who read this client's data?" | Full audit trail + owner Activity page |
| Stolen session | 60-min tokens + instant revocation |
| Credential theft from a DB leak | OAuth tokens encrypted at rest, key held externally |
| Account brute-force | Rate-limited auth endpoints |
| Right to be forgotten | One-click client deletion, full cascade |
| AI provider training on our data | Paid/Vertex tier — no training; DPA available |
| Don't want shared infrastructure | Self-hostable in your own cloud |

---

## Honest status

We believe in being straight about what's done versus in progress.

**In place today:** tenant isolation (RLS), per-client roles, audit logging,
token encryption at rest, cascade erasure, short-lived + revocable sessions,
auth rate-limiting, security response headers (CSP/HSTS), prompt-injection
hardening.

**Operational items finalized per deployment:** confirming the Gemini/Vertex
no-train tier and signing a DPA, enabling database-at-rest encryption on the
managed database, TLS/HSTS at the edge, and provisioning production secrets from
a secrets manager. We'll walk through these with you during onboarding.

*Questions or a security questionnaire to complete? We're happy to go deeper —
the underlying engineering documentation is thorough and available under NDA.*
