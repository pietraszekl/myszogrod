# Myszogród

Myszogród is a private, map-first decision system for comparing land and houses. The master product and architecture source of truth is [`MASTER_PROMPT.md`](./MASTER_PROMPT.md).

## Current Phase

Phase 1 integration work has started:

- Next.js App Router
- TypeScript
- Tailwind CSS
- mobile-first, map-first application shell
- documented master prompt
- Supabase browser/server clients
- OpenFreeMap + MapLibre runtime integration

The current home screen still uses explicitly marked demo data to validate layout, marker language, rating colors, and responsive structure before Supabase tables, Auth, Storage, and RLS are connected.

## Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Secrets must live in local environment files only. Do not commit `.env` or `.env.local`.

Expected variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=
```

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser-safe Supabase access. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a backward-compatible fallback. `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to browser code.

## Implementation Order

1. Phase 0: project setup and app shell.
2. Phase 1: Supabase, database, Auth.
3. Phase 2: users, roles, Superadmin.
4. Phase 3: projects, memberships, join requests.
5. Phase 4: property data model.
6. Phase 5: OpenFreeMap / MapLibre.
7. Phase 6: custom SVG markers.
8. Phase 7: property creation.
9. Phase 8: rating system.
10. Phase 9: photos and Supabase Storage.
11. Phase 10: notes and links.
12. Phase 11: filtering and search.
13. Phase 12: comparison.
14. Phase 13: mobile polish.
15. Phase 14: security audit, performance, testing.
