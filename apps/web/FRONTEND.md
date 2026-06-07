# Agency AI Brain — Frontend Guide & Handoff

The web app (`apps/web`) is a **Next.js 16 (App Router) + React 19 + Tailwind v4 +
shadcn/ui (Base UI variant)** client for the FastAPI backend. This doc reflects the
**current** state so a new session can continue without re-reading everything.

> Backend contract lives at `apps/api` (`/docs`). The frontend only talks HTTP via
> `lib/api.ts` (Bearer session JWT in `localStorage`).

**Auth is Google sign-in** (Google Identity Services), not passwords. The backend
verifies the Google ID token and mints our own session JWT (with `token_version` so
logout/revocation works); the frontend stores that JWT and attaches it as a Bearer
token. See §3 (`/login`, `/accept-invite`) and `components/google-signin.tsx`.

**Multi-tenant, multi-user.** Agency = tenant. The signed-in person is a `Member`
(`Principal` in `lib/api.ts`): an **owner** (`is_owner`, sees all clients + manages
integrations/members) or a per-client member with a `role` of `admin` | `viewer`.
`GET /auth/me` returns the `Principal`. The UI gates owner-only surfaces (Members
panel, Manage integrations) on `is_owner`.

---

## 1. Product model (single-client workstation)

Not a multi-client dashboard — a **single-client workstation**, Slack-style:

- A **client switcher in the rail** (left tier) selects the active client.
- Everything (panel + main window) is **scoped to the selected client**.
- On load the app routes to the **oldest client** (`/` and `/dashboard` resolve to it).
- **No "all clients" home.** `/dashboard` is only the add-client onboarding (or `?add=1`).
- **Integrations are agency-wide** (one shared OAuth workspace): their connection
  status lives in the rail; per-client source *mapping* is set in Configuration.

---

## 2. Design system — DESIGN-5 "midnight command deck" (Linear)

Spec: `DESIGN-5.md` (repo root). **Dark is the default and the star; light is a
derived secondary** — both themes ship and a toggle flips between them (the old
`forcedTheme="light"` lock is gone). Tokens live in `app/globals.css`
(`:root` = light, `.dark` = dark, via next-themes `attribute="class"`,
`defaultTheme="dark"`, `enableSystem={false}`).

### Theme toggle (smooth, not laggy)
`components/theme-toggle.tsx`. We run next-themes with **`disableTransitionOnChange`**
(so hundreds of elements don't animate color at once) and instead crossfade the whole
page once via the **View Transition API** (`document.startViewTransition`) — a single
GPU-composited fade defined in `globals.css` (`::view-transition-*`). Browsers without
the API (or `prefers-reduced-motion`) just swap instantly. The toggle lives in the rail.

### Palette (dark `.dark`)
| Role | Value | Note |
|------|-------|------|
| `--background` (main well) | `#08090a` | onyx, darkest |
| `--sidebar` (panel + backdrop) | `#15171a` | the chrome field |
| `--rail` | `#08090a` | slim rail, always dark |
| `--card` | `#141618` | lifts off the well **by shade, not border** |
| `--muted` (filled fields/chips) | `#17191c` | |
| `--accent` (hover) | `#1f2225` | |
| `--foreground` / `--muted-foreground` | `#f7f8f8` / `#8a8f98` | snow / fog |
| `--border` | `#1d1f23` | low-key, used sparingly |
| `--cta` | `#e4f222` | acid lime — the **one** rationed CTA fill |
| `--ring` / `--link` | `#5e6ad2` / `#8b95e8` | indigo |
| `--destructive` | `#eb5757` | crimson |

Light (`:root`) mirrors this in cool near-whites (main `#ffffff`, panel `#eef0f1`,
card `#f5f6f7`, slate text, indigo link, deepened-lime CTA). The Linear named colors
(`bg-onyx`, `text-fog`, `text-acid-lime`, `bg-crimson`, …) are registered in
`@theme inline` and usable directly.

### Depth & finish (NO gradients — they were removed on purpose)
- **Font:** **Inter** (`--font-inter`, with `cv01`/`ss03` features = the Linear voice) +
  **JetBrains Mono** (`--font-mono-code`, Berkeley-Mono substitute) for IDs/code via the
  **`.mono`** utility (Jira keys, channel IDs, emails).
- **Shadows only** for elevation: `.shadow-soft` / `.shadow-raised` / `.shadow-float` /
  `.shadow-depth` (Linear 4-layer button stack) + `.ring-hairline`. All **theme-aware**
  via `--shadow-color` / `--hairline`. Surfaces separate by **shade**, not borders.
- **`.matte`** — a faint fixed grain (gray noise data-URI, ~6% alpha) layered over the
  rail and the main window for a premium matte finish. `.canvas-warm` is now transparent
  (lets the main's matte show through); `.glow-warm` is a no-op (kept for compatibility).
- **`.cta-lime`** — flat lime fill + dark ink for the single primary action per screen
  (e.g. Configuration → Save).

### Icons
- **Hugeicons** for panel nav (Home03, ReloadIcon, Settings01Icon, AlertCircleIcon).
- **lucide-react** for chrome (Plus, X, PanelLeftClose/Open, Settings2, LogOut, ArrowUp,
  Search, Moon, Sun, Users).
- **`components/brand-icons.tsx`** for provider marks + `PROVIDER_ICON`/`PROVIDER_LABEL`.

---

## 3. Routing

| Route | Purpose |
|-------|---------|
| `/` | Resolver → oldest client (or `/dashboard?add=1` if none). |
| `/login` | **Google sign-in** + inline create-agency onboarding (surfaces pending invites). |
| `/accept-invite?token=` | Invite preview → Google sign-in → accept → client. |
| `/dashboard` | Resolves to oldest client; renders **add-client onboarding** only (or `?add=1`). |
| `/clients/[id]` | **Main view** — chat-first: faded summary + ask composer. |
| `/clients/[id]/configuration` | **Configuration window** (its own page, not a modal) — per-source mapping. |
| `/clients/[id]/alerts` | This client's alerts list with inline Resolve. |
| `/clients/[id]/members` | **Owner-only** members panel: list/role/tag, invite, change role, remove. |
| `/integrations` | Agency OAuth connect (Slack/Jira/Gmail live; Drive "soon"). Owner-only. |

---

## 4. The shell — two-tier sidebar (rail + panel)

The authenticated shell (`components/app-shell.tsx`) is laid out as **in-flow flex
columns** — `[rail][panel][floating main]` — *not* the shadcn fixed `Sidebar` (whose
`fixed left-0` fights a second rail). It's a **fixed-height** shell (`h-svh
overflow-hidden`): the rail and panel never scroll the page; **only the main window
scrolls, inside its rounded container**. The backdrop is `--sidebar`, so the rail and
main float as rounded cards on the panel-colored field.

- **`components/app-data.tsx` (`WorkspaceProvider` / `useWorkspace`)** — single source of
  truth for the shell (me, clients, attention scores, agency `connected` providers,
  `sync()`). Backed by a **module-level cache** so route changes (each page mounts its own
  `<AppShell>`) don't reflash the sidebar — it seeds from cache and revalidates quietly.
- **`components/app-rail.tsx` (tier 1)** — slim always-dark **rounded floating** rail
  (`.matte`): workspace mark → one **avatar per client** (active = raised tile + lime
  edge-marker + indigo ring) → **agency integration icons** (full-color when connected,
  dimmed when not) → **theme toggle** → **account menu**. No dots, no separators (per
  design feedback).
- **`components/app-sidebar.tsx` (tier 2)** — contextual panel for the active client:
  client name header + collapse; **Workspace** section (Home / Attention w/ count /
  Sync / Configuration / Members — Members owner-only). Collapses to width-0 with an
  expand affordance in the main header. (Sources moved to the rail + Configuration.)
- **`Sync`** still polls for real completion: POST `/integrations/sync` returns
  immediately; `sync()` captures the active client's summary `generated_at`, polls
  `/clients/{id}/summary` (3s, ≤90s) until it changes, then `load()`s and broadcasts a
  `window` **`sources-synced`** event the open client page listens for.

### File map
```
app/
  layout.tsx              ThemeProvider(dark default, no forced theme) + Inter/JetBrains-Mono
  globals.css             DESIGN-5 tokens (light+dark), matte/shadow utils, view-transition
  page.tsx                / -> oldest client (or onboarding)
  login/page.tsx          Google sign-in + create-agency onboarding
  accept-invite/page.tsx  invite preview + Google sign-in -> accept
  dashboard/page.tsx      resolver + AddClientForm (onboarding only)
  clients/[id]/page.tsx              CHAT-FIRST view; ask composer (centered when empty,
                                     pinned to bottom once chat starts)
  clients/[id]/configuration/page.tsx  Configuration WINDOW (sections per source)
  clients/[id]/alerts/page.tsx       alerts list + resolve
  clients/[id]/members/page.tsx      owner-only members + invites panel
  integrations/page.tsx   agency OAuth connect (owner-only)

components/
  app-shell.tsx           in-flow [rail][panel][main]; auth gate; mobile drawer (Sheet)
  app-rail.tsx            tier 1 — client avatars + agency integrations + theme + account
  app-sidebar.tsx         tier 2 — active-client nav panel (collapsible)
  app-data.tsx            WorkspaceProvider/useWorkspace (+ module cache, sync)
  theme-toggle.tsx        View-Transition crossfade dark/light toggle
  multi-input.tsx         add/remove list field ("+" rows) used by Configuration
  google-signin.tsx       Google Identity Services button
  brand-icons.tsx         provider SVGs + maps
  theme-provider.tsx      next-themes wrapper
  ui/                     shadcn (Base UI): sidebar, dropdown-menu, dialog, tooltip, sheet,
                          card, button, input, textarea, badge, label, separator, skeleton, sonner
lib/  api.ts · format.ts · rehype-cite.ts · utils.ts
hooks/ use-mobile.ts
```

### Client page (`clients/[id]/page.tsx`) — chat-first
- Faded status summary on top; chat turns (user bubble right, answer left + source chips).
- **One ask card, two placements:** centered as the hero when empty; **pinned as a
  floating composer at the bottom** (`shrink-0` + `bg-background/70 backdrop-blur`) once a
  conversation has started, so messages scroll behind it.
- **Answers render Markdown** via `react-markdown` + the module-level `ANSWER_MD` map;
  inline source citations are faded via `rehypePlugins={[rehypeCite]}` (`lib/rehype-cite.ts`).
- Listens for `sources-synced` and refetches summary + client.

### Configuration window (`clients/[id]/configuration/page.tsx`)
- Replaces the old `?edit=1` modal. Sections per source (Client name, Slack, Jira, Gmail,
  Drive) on borderless `bg-card` surfaces. List fields (channel IDs, project keys, contact
  emails, drive folders) use **`MultiInput`** — a "+"-to-add / "×"-to-remove rows control
  (replaces comma-joined text); IDs render `.mono`. Save PATCHes the client, `load()`s the
  shell, and returns to the client view.

---

## 5. Conventions & gotchas (READ before editing UI)

- **shadcn = Base UI variant** (not Radix). Compose with the **`render` prop**, not `asChild`:
  `<DropdownMenuTrigger render={<button>…</button>} />`. `DropdownMenuLabel` must be inside a
  `DropdownMenuGroup`.
- **`useWorkspace()` must be inside `<AppShell>`** (that's where `WorkspaceProvider` lives) —
  page components that read it put the consuming JSX in an inner component rendered as an
  AppShell child (see `configuration/page.tsx`).
- **Theme:** dark is default; the toggle is in the rail. Don't reintroduce `forcedTheme`.
  Surfaces separate by **shade + shadow**, not borders — avoid adding `border border-border`
  back onto cards/inputs. **No gradients.**
- **Next 16:** client components read route params via `useParams()`. See `apps/web/AGENTS.md`
  — check `node_modules/next/dist/docs/` if an API surprises you.
- **Auth:** `lib/api.ts` attaches the Bearer JWT. **401** clears the token → `/login`; **403**
  is surfaced as an error (NOT logged out). `AppShell` gates on `getToken()`.
- **Forms:** inline the field markup; don't define a field subcomponent *inside* a component
  (remounts each keystroke → input loses focus).

---

## 6. Status

**Done**
- DESIGN-5 dark-first palette + derived light; smooth View-Transition theme toggle; Inter +
  JetBrains Mono; matte finish; gradients removed; low-key shade-based separation.
- **Two-tier sidebar:** rounded floating rail (client avatars + agency integrations + theme +
  account) + collapsible contextual panel; fixed-height shell, scroll only in main; shared
  `WorkspaceProvider` with a module cache (no reflash on navigation).
- Client page chat-first with a **bottom-pinned floating composer**; faded citations.
- **Configuration is its own window** with per-source sections + `MultiInput` ("+") fields.
- Multi-user (Google sign-in, create-agency onboarding, `/accept-invite`, owner-only Members,
  `Principal`-based account block, server-side `logout()`).

**TODO / polish**
- Light-theme matte is subtle (grain barely reads on white) — tune if wanted.
- Clickable source chips → deep-link to the Slack/Jira/Gmail item.
- Mobile pass on the two-tier drawer; richer loading/empty states.
- Logged-out landing/marketing page at `/`.
- Google Drive integration (backend Step 13c pending) → its Integrations row stays "soon".

## 7. Run
```bash
cd apps/web && npm install && npm run dev   # :3000  (backend on :8000)
```
Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (reuse the backend's `GOOGLE_CLIENT_ID`; JS origin
`http://localhost:3000` already authorized) and optionally `NEXT_PUBLIC_API_URL`
(defaults to `http://localhost:8000`). Sign in with Google as the owner to see a client
with Slack+Jira+Gmail data.
