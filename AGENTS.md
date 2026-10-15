# Project instructions

This project is a Next.js App Router application delivered as an installable Progressive Web App (PWA). Use web platform APIs, responsive browser-first UI, and keep offline behavior and cross-browser compatibility in mind.

## Stack and commands

- Read `package.json` before choosing a package or command; use the existing npm scripts and `package-lock.json`.
- `npm run dev` starts the local server.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm test` runs the Node.js unit tests.
- `npm run e2e` runs Playwright browser tests.
- `npm run pwa:validate` and `npm run seo:validate` validate the installable app and public metadata.
- Run lint and typecheck before declaring implementation work complete.

## Routing and application structure

- Use Next.js App Router. Route files live under `src/app/`; shared components, hooks, and utilities live outside that directory.
- Import `Link` and navigation helpers from `next/link` and `next/navigation`.
- Keep private app routes out of search indexing and service-worker caches.
- Preserve the local-first store, Supabase row-level security boundaries, and offline sync behavior when changing data flows.

## PWA and deployment

- Keep the manifest, icons, service worker, and offline shell aligned with the active routes in `public/`.
- Configure the production origin with `NEXT_PUBLIC_SITE_URL` and auth redirects in Supabase before release.
- Keep service-role and provider credentials server-only. Only publishable configuration may use `NEXT_PUBLIC_` variables.
- Review `docs/next-pwa-deployment.md` and `docs/release-checklist.md` before a release.
