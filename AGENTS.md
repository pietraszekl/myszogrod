<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project context

This section is maintained by hand (not auto-generated) and applies regardless of which
model or tool is reading it — Claude, Codex, or anyone else picking up this codebase.
Keep it updated when architecture or conventions change; don't let it go stale the way
`MASTER_PROMPT.md` did.

## What this is

Myszogród ("mouse garden") is a map-first tool for two or more people to jointly evaluate
land plots and houses: pin a location, score it against custom criteria, attach photos and
notes, and see the same shared list as your collaborators. Polish-only UI copy throughout
(`pl` locale) — this is not an i18n'd app.

## Stack

- Next.js App Router (Turbopack), TypeScript, Tailwind CSS v4 (CSS-first config — no
  `tailwind.config.*`; tokens/theme live in `@theme inline` at the top of
  `src/app/globals.css`).
- Supabase: Postgres + Auth + Storage + Row Level Security. Schema lives entirely in
  `supabase/migrations/*.sql`, applied in filename order — **never edit an already-applied
  migration; always add a new one**, then `supabase db push` (project must already be
  `supabase link`ed). RLS is the actual authorization layer; the client never trusts itself.
- OpenFreeMap + MapLibre GL for the map (free, keyless tiles). Nominatim/OpenStreetMap for
  geocoding, proxied through `src/app/api/geocode/route.ts` (also keyless). No Google Maps
  key is used despite what `MASTER_PROMPT.md` still says.

## Architecture

`src/app/page.tsx` is the orchestrator — nearly all app state (auth, active project,
properties, UI panel open/closed flags) lives here via `useState`/`useEffect`, passed down
as props to presentational components in `src/app/_home/components/`. Two custom hooks pull
out the meatier stateful logic: `usePropertyEditor` (add/edit property form, geocoding
lookup) and `usePropertyFilters` (type/status/rating filters + the filtered list).

Supabase clients: `src/lib/supabase/browser.ts` (client components), `server.ts` (server
components/route handlers, cookie-based session), `middleware.ts` (session refresh). All
three read env vars via `src/lib/supabase/env.ts` — never hardcode a URL or key.

**Overlay mutual exclusion**: `settingsOpen`, `addPropertyOpen` (from `usePropertyEditor`),
and `detailsOpen` are independent booleans, but every entry point that opens one explicitly
closes the other two (see `openSettings`, `handleOpenAddProperty`, `selectProperty` in
`page.tsx`). If you add a new full-screen overlay, wire it into this same pattern — don't
rely on z-index/backdrop-blocking alone to prevent two overlays being open at once.

**Mobile vs desktop layout** diverges by breakpoint via Tailwind (`lg:` prefix), not JS
media-query state: `PropertySidebar` (desktop, always-visible property list) is
`hidden lg:block`; `MobileHeader`'s filter dropdown carries the property list only on
mobile (`FilterPanel`'s `compact` prop, derived from whether a `propertyList` node was
passed in — desktop's filter panel doesn't get one). `PropertyDetailsPanel`'s "dialog" mode
(bottom sheet) is wrapped `lg:hidden` in `page.tsx` since desktop already shows details via
the always-visible "sidebar" mode of the same component.

## Data model & sharing

Tables: `projects` (owner_id), `project_members` (project_id, user_id, role: owner/admin/
member — junction table, RLS keys off this everywhere), `project_invitations` (pending
invites by email, not user_id — a user doesn't need to exist yet to be invited),
`properties` (project_id, created_by).

**Invitations are explicit, not auto-accept.** A user must actively accept or decline via
`PendingInvitationsPanel` (a blocking modal gate, `.invite-gate`, z-index above every other
overlay — deliberately: the user must resolve it before doing anything else). Key RPCs:
`list_my_pending_invitations()`, `accept_project_invitation(id)`,
`decline_project_invitation(id)`, `remove_project_member(project_id, user_id)` (blocks
removing the project owner — would otherwise strand the project with no admin). There is
**no invite email sent** — the inviter gets a copy-pasteable instruction block
(`createInviteInstructions` in `auth-utils.ts`) to send manually via whatever channel. This
was a deliberate, explicit product decision — don't "fix" it by wiring up transactional
email without checking first.

A user can belong to multiple projects, but **there is no project switcher UI yet** —
`activeProjectId` just defaults to the first project by `created_at`. If two of a user's
projects are both still named the default "Mój projekt" (from `create_project` RPC), they
are currently indistinguishable in the UI. Worth building if this comes up again.

Property location has two origins that matter for editing: geocoded (real address, resolved
via Nominatim) or manually pinned (long-press on map, location text literally
`"Punkt z mapy (lat, lng)"`). `usePropertyEditor`'s `manualPropertyCoordinates` state tracks
which mode is active — `openEditProperty` seeds it from the property's existing coordinates
so opening the edit form never re-triggers a geocode lookup against a synthetic label or an
already-resolved address; it only clears (re-enabling lookup) when the user actually edits
the location field. If you touch this flow, preserve that distinction — it was a real,
reported bug (editing a manually-pinned property threw a false "location not found" error).

## Known gaps / stale things

- `MASTER_PROMPT.md` is the original planning doc and is **out of date** (references a
  Google Maps API key that's no longer used, an old phased roadmap that's long since been
  superseded). Don't treat it as current — this file is.
- `tests/e2e/auth.spec.ts` mocks an RPC (`accept_my_project_invitations`) that no longer
  exists in the schema — it was replaced by the explicit accept/decline flow above. The
  mock is dead code (never hit), not a functional bug, but the test suite hasn't been
  updated to reflect the current invite flow.
- No project switcher UI (see above).
- iOS Safari doesn't focus `<button>` on tap by default, so the `:hover`/`:focus-within`
  info-popover tooltips in `PropertyFormDialog` are likely unreachable on iPhone. Not yet
  fixed.

## Conventions

- All user-facing text is Polish. Match existing tone/phrasing when adding strings.
- Before considering any change done: `npx tsc --noEmit -p .`, `npm run lint`, and
  `npm run build` all clean. This repo has no CI configured — these checks are manual.
- Git history was rewritten with `git-filter-repo` (2026-09-24) to scrub a leaked personal
  email from every commit. If you're operating on a stale local clone from before that,
  `git fetch && git reset --hard origin/main` rather than trying to merge/rebase it.
- Never commit `.env`/`.env.local`. `.env.example` documents the required variables; keep
  it in sync if you add new ones.
