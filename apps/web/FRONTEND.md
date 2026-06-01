# Agency AI Brain — Frontend Guide & Handoff

The web app (`apps/web`) is a **Next.js 16 (App Router) + React 19 + Tailwind v4 +
shadcn/ui (Base UI variant)** client for the FastAPI backend. This doc captures the
design direction, architecture, decisions, and gotchas so a new session can continue
without re-reading everything.

> Backend contract lives at `apps/api` (`/docs`). The frontend only talks HTTP via
> `lib/api.ts` (Bearer token in `localStorage`).

---

## 1. Product model (IMPORTANT — single-client focus)

This is **not** a multi-client dashboard. It's a **single-client workstation**, Slack-style:

- A **client switcher at the top of the sidebar** picks the active client.
- Everything (sidebar + main window) is **scoped to the selected client**.
- On load, the app routes to the **oldest client** (`/` and `/dashboard` resolve to it).
- There is **no "all clients" / overview home**. `/dashboard` is now *only* the
  add-client onboarding screen (also reached via `?add=1`).
- **Integrations are not a primary nav item.** Connecting providers (agency-level
  OAuth) lives in the account menu → "Manage integrations" (`/integrations`).
  The sidebar instead shows **per-client source status**.

---

## 2. Design system

Primary spec: **`DESIGN-4.md`** (repo root) — "frosted glass workstation," ChatGPT-style.
Light theme only. Achromatic grays + a single accent (Link Blue). Tokens are wired into
`app/globals.css`.

### Palette (in `globals.css` `:root`)
| Role | Value | Notes |
|------|-------|-------|
| `--background` (Snow) | `#ffffff` | page/cards |
| `--foreground` (Carbon) | `#0d0d0d` | primary text |
| `--muted` (Fog) | `#f9f9f9` | panels |
| `--sidebar` (Fog) | `#f9f9f9` | sidebar bg |
| `--muted-foreground` (Pewter) | `#5d5d5d` | secondary / "faded but readable" |
| `--accent` (Arctic Mist) | `#ececec` | hover |
| `--primary` (Carbon) | `#0d0d0d` | black filled button |
| `--ring` / `--color-link` (Link Blue) | `#007aff` | focus + the only accent color |
| `--border` | `rgba(13,13,13,0.08)` | hairline |
| `--radius` | `0.625rem` (10px) | buttons/default; main ask input uses `28px` |

- **Font:** system `ui-sans-serif` stack (set as `--font-sans` in `:root`). The design's
  "OpenAI Sans" → system-ui substitute. **Do not reintroduce Geist.** (SF Pro on macOS.)
- **Theme is forced light** in `app/layout.tsx` (`forcedTheme="light"`). No theme toggle.
- **Depth:** the spec says "avoid heavy shadows," but the user wants it to not look flat.
  Use the soft utilities in `globals.css`: `.shadow-soft`, `.shadow-float`, `.ring-hairline`.
  Keep depth subtle (hairline + faint drop), never heavy.

### Target aesthetic (north star — not fully there yet)
The user's reference is the **Dia/Arc "Ask anything"** screen: a **warm cream→amber
gradient** canvas with a **frosted, floating, centered Ask card**, soft glow, and
suggestion rows with source favicons. Current main window is more austere/gray —
**the empty/home state should evolve toward that warm, centered, frosted feel**
(a gradient backdrop + a prominent floating ask card + grounded suggestion rows).
Keep it tasteful and within the neutral+Link-Blue palette unless the user okays warm tones.

---

## 3. Information architecture / routing

| Route | Purpose |
|-------|---------|
| `/` | Resolver: → oldest client, or `/dashboard?add=1` if none. |
| `/login` | Register/login (our JWT auth, not Clerk). Stores token, → `/`. |
| `/dashboard` | Resolves to oldest client; renders **add-client onboarding** only (or with `?add=1`). |
| `/clients/[id]` | **The main view** — chat-first: faded summary + ask box. `?edit=1` opens the sources editor. |
| `/integrations` | Connect/manage agency OAuth (Slack/Jira/Gmail). Reached from account menu, not primary nav. |

---

## 4. File map

```
app/
  layout.tsx           ThemeProvider(forcedTheme=light) + TooltipProvider + Toaster
  globals.css          DESIGN-4 palette, fonts, depth utilities
  page.tsx             / -> oldest client (or onboarding)
  login/page.tsx       auth
  dashboard/page.tsx   resolver + AddClientForm (onboarding only)
  clients/[id]/page.tsx  CHAT-FIRST client view + EditClientForm
  integrations/page.tsx  agency OAuth connect (Slack/Jira/Gmail live; Drive "soon")

components/
  app-shell.tsx        SidebarProvider + AppSidebar + SidebarInset; auth gate.
                       Header is md:hidden (mobile-only drawer trigger).
  app-sidebar.tsx      Client switcher (top) · per-client Sources icons · collapse · account menu
  brand-icons.tsx      Slack/Jira/Gmail/Drive SVGs + PROVIDER_ICON/PROVIDER_LABEL maps
  theme-provider.tsx   next-themes wrapper (forced light)
  ui/                  shadcn (Base UI): sidebar, dropdown-menu, tooltip, sheet, card,
                       button, input, textarea, badge, label, separator, skeleton, sonner

lib/
  api.ts               fetch wrapper (Bearer, 401/403->/login) + shared TS types
  format.ts            relativeTime, scoreColor, severityVariant, sourceLabel
hooks/
  use-mobile.ts        shadcn sidebar mobile hook
```

### Sidebar behavior (`app-sidebar.tsx`)
- **Header:** client switcher — a `DropdownMenu` listing clients (with attention dots)
  + "Add client". Active client shown with initials avatar. Collapses to icon mode.
- **Content (when a client is active):**
  - "Summary & chat" (→ client page) and "Edit sources" (→ `?edit=1`).
  - **Sources row:** the 4 provider icons; **colored if mapped to THIS client, grey
    (grayscale+opacity) if not** — `mappedProviders(client)` derives this from the
    client's `slack_channel_ids` / `jira_project_keys` / `domain|contact_emails` /
    `drive_folder_ids`. Clicking → `?edit=1`.
- **Footer:** Collapse (inside sidebar, `useSidebar().toggleSidebar`), Account dropdown
  (Manage integrations, Sign out). **No theme toggle.**

### Client page (`clients/[id]/page.tsx`) — chat-first
- Faded-but-readable **status summary** (Pewter) at top with an eyebrow + "generated Xh ago".
- A scrolling **conversation** of Q&A turns (user bubble right, answer left + source chips).
- A pinned, rounded **ask box** (28px radius, `shadow-soft`, Enter-to-send) — the default
  focus of the window.
- Action bar (top-right): "Sources" (toggles `EditClientForm`) + "Sync".

---

## 5. Conventions & gotchas (READ before editing UI)

- **shadcn here is the Base UI variant**, not Radix. Composition uses the **`render`
  prop**, not `asChild`. Pattern: `render={<Link href=... />}` or put children *inside*
  the element in the render prop and **self-close** the wrapper:
  ```tsx
  <DropdownMenuTrigger render={<button>…children…</button>} />
  ```
  Passing a self-closed `render={<button/>}` AND separate children breaks the parser.
- **`DropdownMenuLabel` is `Menu.GroupLabel`** → it MUST be inside a `DropdownMenuGroup`,
  or you get a runtime `MenuGroupContext is missing` crash.
- **Next 16:** client components read route params with `useParams()` (only *server*
  components await the `params` promise). Avoid `useSearchParams()` without a Suspense
  boundary — read `window.location.search` in an effect instead (see `?edit=1`/`?add=1`).
- **AGENTS.md** in `apps/web` warns this Next is not training-data Next; check
  `node_modules/next/dist/docs/` if an API surprises you.
- **Auth:** `lib/api.ts` attaches the Bearer token and redirects to `/login` on 401/403.
  `AppShell` also gates on `getToken()`.
- **Lucide** is `lucide-react@^1.x` here — standard icon names work.
- **Forms:** inline the field markup; don't define a `Field` subcomponent *inside* a
  component (it remounts on each keystroke and loses input focus).

---

## 6. Status

**Done this session**
- DESIGN-4 palette + system font + depth utilities; forced light.
- Single-client model; route to oldest client; `/dashboard` = onboarding only.
- Sidebar: top client switcher, per-client source icons (grey/colored), collapse inside,
  account menu; integrations removed from primary nav.
- Client page rebuilt chat-first (faded summary + pinned ask box + chat turns + source chips).
- Removed the outside (header) collapse button on desktop.

**TODO / polish (next session)**
- Push the empty/home state toward the **warm frosted "Ask anything"** north-star
  (gradient canvas, floating ask card, suggestion rows with source favicons).
- Clickable source chips → deep-link to the actual Slack/Jira/Gmail item.
- Loading/skeleton polish; empty states; mobile pass.
- Landing/marketing page at `/` for logged-out visitors (currently `/` only redirects).
- Consider a subtle attention badge in the switcher; alerts surfacing in the client view.

## 7. Run
```bash
cd apps/web && npm install && npm run dev   # :3000  (backend must run on :8000)
```
Login `ybharadwaj131@gmail.com` to see a client with Slack+Jira+Gmail data.
