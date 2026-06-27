# Neuron — Landing Page Structure

> The blueprint for the marketing landing page (`apps/web/app/page.tsx`).
> Grounded in the real product (see `agency-ai-brain-tech.md` → "The 4 core
> systems", and `SECURITY-OVERVIEW.md`). Build sections against *this* doc, not
> from memory.

---

## Guiding principle — one feature, one section

We're moving **away** from a single "Features" grid (6 small cards + a bento
grid) and **toward** the Aside-style pattern: **every capability gets its own
full-width section** with its own headline, tagline, and a dedicated visual that
demonstrates it. The page reads as a guided scroll, not a spec sheet.

**Rhythm rules**
- One core system per section. Don't combine two systems into one grid.
- Alternate the visual side: section A = text left / visual right, section B =
  visual left / text right, and so on. Keeps the scroll from feeling like a list.
- Each section: an eyebrow (uppercase kicker), a headline (`font-display`), a
  one-line tagline, optional 2–3 sub-points, one visual.
- **Light mode is the target** for all new visuals (light card surfaces, colored
  accents — not the dark glossy fills from reference screenshots).
- Reuse existing tokens: `--color-indigo #5e6ad2`, `--color-emerald`,
  `--color-acid-lime #d3e017` (rationed CTA), `border-border`, `bg-card`.

**Honesty rules (from the docs)**
- Live integrations: **Slack, Gmail, Jira**. **Drive** is next (planned). Don't
  imply Notion/GitHub/WhatsApp are live — they are not part of the product.
- The Q&A demo on the page is a *simulation* (canned answers). Fine for
  marketing, but don't claim it's calling the live API.
- Security claims must match `SECURITY-OVERVIEW.md` (RLS isolation, encrypted
  tokens, audit trail, Google-only sign-in, 60-min sessions).

---

## Page order (top → bottom)

| # | Section | Status |
|---|---------|--------|
| 1 | Nav (sticky) | keep as-is |
| 2 | Hero | keep as-is |
| 3 | MacBook product preview | keep as-is |
| 4 | Integration marquee | keep as-is |
| 5 | Stats (30 min / 15+ / 3s) | keep as-is |
| 6 | **Feature section 1 — Integrations** | NEW (replaces bento item 1) |
| 7 | **Feature section 2 — Ask bar (RAG)** | NEW (folds in the existing Q&A demo) |
| 8 | **Feature section 3 — Attention feed** | NEW |
| 9 | **Feature section 4 — Per-client summaries** | NEW |
| 10 | **Feature section 5 — Security & isolation** | NEW (3-pillar, Aside-style) |
| 11 | "How it works" (3 steps + neural SVG) | keep — acts as the recap |
| 12 | Pricing | keep as-is |
| 13 | CTA banner | keep as-is |
| 14 | Footer | keep as-is |

> Sections 6–10 **replace** the current `#features` block (the 6 `CardSpotlight`
> cards + the 4-item `BentoGrid`). The interactive Q&A terminal demo is **not
> deleted** — it moves into section 7 as that section's visual.

---

## The feature sections

Each maps to one of the product's 4 core systems (+ security). Visual side
alternates as noted.

### Section 6 — Integrations  *(visual right)*
- **Eyebrow:** Integrations
- **Headline:** Every tool, one client brain
- **Tagline:** Slack, Gmail, and Jira flow in automatically — no uploads, no
  copy-paste. Drive is next.
- **Sub-points (optional):** Auto-backfills the last 7 days · Re-syncs every 2
  hours · Per-client namespace
- **Visual:** `IntegrationsBeam` — AnimatedBeam with **Slack / Gmail / Jira /
  Drive** on the left → **Neuron core** (our neuron logomark, not OpenAI) in the
  center → **a user** on the right. Light surfaces, indigo beams.
- Source system: Ingestion pipeline (`workers/ingestion/`).

### Section 7 — Ask anything  *(visual left)*
- **Eyebrow:** Natural-language Q&A
- **Headline:** Ask anything. Get cited answers.
- **Tagline:** Type a question in plain English. Neuron retrieves across months
  of history and answers in seconds — every claim cited to the exact Slack
  message or Jira ticket.
- **Visual:** the existing interactive terminal demo (the 3 presets + typewriter
  + citations). Reuse as-is; just relocate it here.
- Source system: Ask bar / RAG (`ai/rag.py`).

### Section 8 — Attention feed  *(visual right)*
- **Eyebrow:** Daily briefing
- **Headline:** Know what needs you — before you open Slack
- **Tagline:** A morning feed of what's slipping across every client: silent
  clients, deadlines with no ticket activity, blocked tickets, scope creep.
- **Sub-points:** Silent-client alert · Stale-ticket alert · Scope-creep flag
- **Visual:** a stack of alert tiles (icon + client + one-line reason + age).
  New light-mode component.
- Source system: Attention feed (`routers/summaries.py`).

### Section 9 — Per-client summaries  *(visual left)*
- **Eyebrow:** Always-current context
- **Headline:** One living brief per client
- **Tagline:** Every client gets an auto-generated status paragraph that
  refreshes as new activity lands — open a client and you're caught up in one
  read.
- **Visual:** a "client brain" card (summary paragraph + last-updated chip +
  source pills). New light-mode component.
- Source system: Summarizer (`workers/summarizer.py`).

### Section 10 — Security & isolation  *(3-pillar, Aside-style)*
- **Eyebrow:** Built for client trust
- **Headline:** Walled off at the database
- **Tagline:** Your clients' data deserves a higher bar than a typical dashboard.
- **Three pillars** (icon + title + one line each):
  1. **Isolated per agency** — Postgres Row-Level Security enforces separation in
     the database itself, not just our code.
  2. **Credentials encrypted at rest** — Slack/Gmail/Jira tokens encrypted with
     the key held outside the database. Disconnect → revoked + purged.
  3. **A complete audit trail** — Who viewed which client, and what they asked,
     is logged. The owner has a dedicated Activity page.
- All claims sourced from `SECURITY-OVERVIEW.md`. Do not overstate.

---

## Reusable section component

To keep sections consistent, add one component:

```
components/sections/feature-section.tsx
  <FeatureSection
    eyebrow, headline, tagline,
    points?: string[],          // optional sub-bullets
    reverse?: boolean,          // visual on left when true
    children                    // the visual
  />
```

- Two-column on `md+`, stacked on mobile.
- `reverse` flips column order (drives the alternating rhythm).
- Scroll-reveal on enter (reuse the existing `motion`/`whileInView` pattern).

---

## New visual components to build (light mode)

| Component | File | Used by |
|-----------|------|---------|
| `IntegrationsBeam` | `components/illustrations/integrations-beam.tsx` | §6 |
| (reuse) Q&A terminal demo | already in `page.tsx` | §7 |
| `AttentionFeedTiles` | `components/illustrations/attention-feed-tiles.tsx` | §8 |
| `ClientBriefCard` | `components/illustrations/client-brief-card.tsx` | §9 |
| 3-pillar grid (inline) | in §10 | §10 |

Old components to retire from the landing page once sections land:
`IntegrationsOrbit`, `BrainHalftone`, `ServerIsometric`, `RecallChart` (the
bento illustrations) — keep the files; just stop importing them on the landing
page unless repurposed.

---

## Build order

1. `FeatureSection` wrapper component.
2. §6 Integrations + `IntegrationsBeam` (the piece already in flight).
3. §7 — relocate the existing Q&A demo into a section.
4. §8 + `AttentionFeedTiles`.
5. §9 + `ClientBriefCard`.
6. §10 security pillars.
7. Delete the old `#features` card grid + bento from `page.tsx`.
8. Verify light + dark render, mobile stacking, and that beams animate.
