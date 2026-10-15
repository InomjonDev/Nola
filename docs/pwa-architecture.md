# Nola PWA architecture

Nola is a responsive Next.js App Router application delivered as an installable Progressive Web App. Its browser client provides local-first expense entry, offline persistence, and queued cloud synchronization.

## Application layers

- `src/app/` contains route entry points, route metadata, and API handlers.
- `src/components/` contains the application shell, screens, forms, dialogs, and shared visual components.
- `src/lib/` contains domain types, local state, persistence, synchronization, Supabase adapters, parsing, exports, and localization.
- `src/theme/` contains shared design tokens and theme initialization.
- `public/manifest.webmanifest` and `public/sw.js` define installation metadata, the offline shell, safe cache rules, and notification click handling.
- `supabase/migrations/` defines cloud tables, constraints, row-level security, and authenticated database functions.

## Data and service boundaries

The app writes to local browser storage first, then queues owner-scoped Supabase changes when cloud sync is available. Supabase RLS is the authorization boundary for user records. The spending parser route validates the caller's access token, checks the user's parsing consent, enforces a database-backed quota, and calls the configured parsing provider using a server-only key.

Private routes and authenticated responses must not be cached by the shared service worker. Public landing and legal pages provide crawlable metadata; signed-in workspace routes remain private and noindex.

## Release path

Use the npm scripts in `package.json` for lint, typecheck, tests, end-to-end checks, PWA and SEO validation, and production build. Configure the final HTTPS site origin, Supabase redirects, production secrets, migrations, and optional push infrastructure as described in `docs/next-pwa-deployment.md` and `docs/release-checklist.md`.
