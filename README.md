# Myszogród

A map-first tool for comparing land plots and houses with someone you're house-hunting with. Pin locations on a map, score them against your own criteria, add photos and notes, and share a project so you both see the same list.

Built with Next.js (App Router), Supabase (Postgres, Auth, Storage, RLS), and OpenFreeMap/MapLibre for maps.

## Quickstart

Every deployment (including yours) needs its own Supabase project — there is no shared backend to connect to.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** — [supabase.com/dashboard](https://supabase.com/dashboard) → New project. Free tier is enough.

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the values from your Supabase project's **Settings → API** page:

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project API keys → `anon` / `publishable` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → `service_role` key (keep this one server-side only, never commit it) |

4. **Apply the database schema** — this creates every table, RLS policy, RPC function, and the photo storage bucket. Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>   # the ref is in your project's URL/Settings
   supabase db push
   ```

5. **Run it**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign up with an email/password, and you're in your own project.

No other API keys are needed — geocoding (Nominatim/OpenStreetMap) and map tiles (OpenFreeMap) are free and keyless.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright end-to-end tests |

## Project docs

- [`AGENTS.md`](./AGENTS.md) — architecture, data model, and conventions for anyone (human or AI assistant) picking up work on this codebase.
- [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) — the original product/architecture spec this project started from. It predates most of the current feature set (collaboration, invites, mobile UX) and no longer fully reflects the app — treat `AGENTS.md` as current, this as historical context.

## Security

Never commit `.env` or `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely — it's read only in server-side API routes (`src/app/api/`), never sent to the browser.
