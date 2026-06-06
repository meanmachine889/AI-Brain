# Agency AI Brain — Frontend Guide & Handoff

The web app (`apps/web`) is a **Next.js 16 (App Router) + React 19 + Tailwind v4 +
shadcn/ui (Base UI variant)** client for the FastAPI backend. This doc reflects the
**current** state so a new session can continue without re-reading everything.

> Backend contract lives at `apps/api` (`/docs`). The frontend only talks HTTP via
> `lib/api.ts` (Bearer token in `localStorage`).

---

## 1. Product model (single-client workstation)

Not a multi-client dashboard — a **single-client workstation**, Slack-style:

- A **client switcher at the top of the sidebar** selects the active client.
- Everything (sidebar + main window) is **scoped to the selected client**.
- On load the app routes to the **oldest client** (`/` and `/dashboard` resolve to it).
- **No "all clients" home.** `/dashboard` is only the add-client onboarding (or `?add=1`).
- **Integrations connection (agency OAuth)** lives in the account menu → "Manage
  integrations" (`/integrations`); it is **not** a primary nav item. The sidebar shows
  **per-client source mapping** instead.

---

## 2. Design system

Spec: `DESIGN-4.md` (repo root) — frosted workstation. **Light theme only**
(`forcedTheme="light"` in `app/layout.tsx`; no theme toggle). The palette has been tuned
**neutral / barely-warm** (not strong cream). Single accent = Link Blue. Tokens live in
`app/globals.css`.

### Palette (`globals.css` `:root`)
| Role | Value |
|------|-------|
| `--background` / `--card` | `#ffffff` |
| `--foreground` (text) | `#1d1c1a` |
| `--muted` (fog) | `#f6f5f3` |
| `--muted-foreground` (pewter) | `#6a6862` |
| `--accent` (hover) | `#efeeea` |
| `--primary` | `#1d1c1a` (fg `#fafafa`) |
| `--sidebar` | `#f6f5f2` |
| `--border` | `rgba(40,36,28,0.08)` |
| `--ring` / `--color-link` | `#007aff` (only accent) |
| `--destructive` | `#d2483f` |
| `--radius` | `0.625rem` (ask card uses `24px`) |

- **Font:** system `ui-sans-serif` stack (set as `--font-sans`). No Geist.
- **Depth utilities** (`globals.css`): `.shadow-soft`, `.shadow-raised`, `.shadow-float`,
  `.ring-hairline`. Raised surfaces (switcher, active nav item, ask card, integration
  rows when mapped) lift off the canvas with soft layered shadows.
- **Canvas:** `.canvas-warm` (subtle white→`#f6f4f0` radial) on the main work area;
  `.glow-warm` (faint amber) sits behind the ask card.

### Icons
- **Hugeicons** (`@hugeicons/react` + `@hugeicons/core-free-icons`) for sidebar nav:
  `<HugeiconsIcon icon={Home03Icon} />` (Home03, ReloadIcon, Settings01Icon, AlertCircleIcon).
- **lucide-react** for misc chrome (Plus, Check, ChevronsUpDown, PanelLeft, Settings2,
  LogOut, ArrowUp, Search).
- **`components/brand-icons.tsx`** for provider marks (Slack/Jira/Gmail/Drive) +
  `PROVIDER_ICON` / `PROVIDER_LABEL`.

---

## 3. Routing

| Route | Purpose |
|-------|---------|
| `/` | Resolver → oldest client (or `/dashboard?add=1` if none). |
| `/login` | Register/login (our JWT). |
| `/dashboard` | Resolves to oldest client; renders **add-client onboarding** only (or `?add=1`). |
| `/clients/[id]` | **Main view** — chat-first: faded summary + ask card. `?edit=1` opens the **Configuration dialog**. |
| `/clients/[id]/alerts` | This client's alerts list with inline Resolve. |
| `/integrations` | Agency OAuth connect (Slack/Jira/Gmail live; Drive "soon"). From account menu. |

---

## 4. File map

```
app/
  layout.tsx              ThemeProvider(forcedTheme=light) + TooltipProvider + Toaster
  globals.css             palette, fonts, depth + canvas/glow utilities
  page.tsx                / -> oldest client (or onboarding)
  login/page.tsx          auth
  dashboard/page.tsx      resolver + AddClientForm (onboarding only)
  clients/[id]/page.tsx   CHAT-FIRST view + Configuration <Dialog> (Suspense + useSearchParams)
  clients/[id]/alerts/page.tsx   alerts list + resolve
  integrations/page.tsx   agency OAuth connect

components/
  app-shell.tsx           SidebarProvider + AppSidebar + SidebarInset; auth gate; header md:hidden
  app-sidebar.tsx         switcher · Home/Attention/Sync/Configuration · Integrations rows · account
  brand-icons.tsx         provider SVGs + maps
  theme-provider.tsx      next-themes wrapper (forced light)
  ui/                     shadcn (Base UI): sidebar, dropdown-menu, dialog, tooltip, sheet,
                          card, button, input, textarea, badge, label, separator, skeleton, sonner
lib/  api.ts (fetch+types) · format.ts (relativeTime, scoreColor, severityVariant, sourceLabel)
hooks/ use-mobile.ts
```

### Sidebar (`app-sidebar.tsx`) — `variant="inset" collapsible="icon"`
- **Header:** client switcher (DropdownMenu of clients + attention dot + "Add client").
- **Client nav** (active client): **Home** (active, raised pill) · **Attention** (shown only
  when `scores[id].alert_count > 0`, → `/clients/[id]/alerts`) · **Sync** (in-sidebar action,
  POST `/integrations/sync`) · **Configuration** (→ `?edit=1`).
  - **Sync polls for real completion.** The POST returns immediately while the worker ingests
    + re-summarizes in the background, so `sync()` captures the active client's summary
    `generated_at`, then polls `/clients/{id}/summary` (every 3s, ≤90s) until it changes —
    the spinner stays "Syncing…" for the *actual* duration. On finish it refetches the sidebar
    (`load()`) and broadcasts a `window` **`sources-synced`** event; the open client page
    listens and refetches. (Avoids the old "fire-and-forget, never refreshes" bug.)
- **Integrations group:** one provider per row — brand icon + label + a trailing **status dot**
  (emerald if mapped to THIS client, hollow ring if not). `mappedProviders(client)` derives
  mapping from `slack_channel_ids` / `jira_project_keys` / `domain|contact_emails` /
  `drive_folder_ids`. Rows collapse to icon-only with the sidebar; click → `?edit=1`.
- **Footer:** Collapse (`useSidebar().toggleSidebar`) + Account dropdown (Manage integrations,
  Sign out).

### Client page (`clients/[id]/page.tsx`) — chat-first
- Warm canvas + glow. **Faded status summary** (Pewter) at top. Chat turns (user bubble right,
  answer left + source chips). Frosted **ask card** (24px, `shadow-float`, Enter-to-send).
- **Answers render Markdown.** The backend returns Markdown (bold/bullets); render via
  **`react-markdown`** with a module-level `ANSWER_MD` component map (per-element Tailwind, since
  there's no typography plugin on v4) — NOT raw `{t.answer}`, which printed literal `**`/`*`.
- Listens for the sidebar's **`sources-synced`** event and refetches summary + client.
- **Configuration** is a shadcn **`Dialog`** opened by `?edit=1` (the page wraps the view in
  `<Suspense>` and reads `useSearchParams()`); `EditClientForm` PATCHes the client.

---

## 5. Conventions & gotchas (READ before editing UI)

- **shadcn = Base UI variant** (not Radix). Compose with the **`render` prop**, not `asChild`.
  Put children *inside* the element in `render` and self-close the wrapper:
  `<DropdownMenuTrigger render={<button>…</button>} />`.
- **`DropdownMenuLabel` is `Menu.GroupLabel`** → must be inside a `DropdownMenuGroup`
  (else runtime `MenuGroupContext is missing`).
- **`useSearchParams()` is fine but needs a `<Suspense>` boundary** — the client page wraps
  its body in `<Suspense fallback={null}>` for exactly this. (Alternative used elsewhere:
  read `window.location.search` in an effect.)
- **Next 16:** client components read route params via `useParams()` (only server components
  await the `params` promise). See `apps/web/AGENTS.md` — check `node_modules/next/dist/docs/`
  if an API surprises you.
- **Auth:** `lib/api.ts` attaches Bearer + redirects to `/login` on 401/403; `AppShell` gates.
- **Forms:** inline the field markup; don't define a `Field` subcomponent *inside* a component
  (remounts each keystroke → input loses focus).
- **Raised-active styling:** `data-active:bg-background data-active:shadow-soft data-active:ring-hairline`.

---

## 6. Status

**Done**
- Single-client model; route to oldest client; `/dashboard` = onboarding only.
- Neutral/barely-warm frosted palette, system font, forced light, depth + canvas/glow utils.
- Sidebar: switcher, Home/Attention/Sync/Configuration, per-provider Integrations rows with
  status dots, collapse, account menu, Hugeicons.
- Client page chat-first; Configuration as a Dialog; alerts on their own route.

**TODO / polish**
- Push the empty state further toward the warm frosted **"Ask anything"** north-star
  (centered card, suggestion rows with source favicons) if desired.
- Clickable source chips → deep-link to the Slack/Jira/Gmail item.
- Mobile pass; richer loading/empty states.
- Logged-out landing/marketing page at `/`.

## 7. Run
```bash
cd apps/web && npm install && npm run dev   # :3000  (backend on :8000)
```
Login `ybharadwaj131@gmail.com` to see a client with Slack+Jira+Gmail data.
