# Walletly Savings Goals Implementation Plan

**Goal:** Manually tracked savings goals in Insights with a compact Home preview.

**Architecture:** Derive progress from individually identified deposit/withdrawal records. Extend the account-scoped local store and existing upsert queue; sync parents before children. Supabase owns authorization and referential integrity, not a mutable saved-total column.

**Tech stack:** Next.js App Router, TypeScript, React, Tailwind semantic tokens, Lucide, Supabase, Node tests, Playwright.

## Constraints
- Local changes only: no commit, deployment, or hosted migration execution.
- No automatic allocations, conversion, bank transfers, or new notifications.
- English, Russian, Uzbek Latin; light/dark; 44px targets; reduced motion.

## Tasks
- [x] Domain: add SavingsGoal/GoalContribution types, pure validation/progress/account-normalization helpers, and unit tests. Amounts use integer cents for calculations; deadlines are local calendar dates; currency locks after any contribution. Derive reached/overdue/negative-balance states.
- [x] Persistence: add mappers and store actions for save, archive/reopen, delete, deposit/withdrawal. Extend hydration, owner filtering, pulls, queue ordering, and JSON/CSV exports. Preserve existing account deletion cleanup. Stable contribution IDs make retries idempotent.
- [x] Database: generate a new local migration using Supabase CLI. Add ownership RLS, explicit grants, composite parent ownership/currency FK, account cascade, and immutable financial contribution fields. Add populated two-user RLS tests and verify on an isolated local Postgres database when available.
- [x] Interface: separate savings-goals component module; Goals segmented tab in Insights; Home preview links to that tab. Use animated accessible sheets with focus trapping/restoration and custom date/icon/currency controls. Show progress, history, archive/reopen, withdrawal errors, and confirmed deletion.
- [x] Verification: add lifecycle/export/offline sync/localization/theme E2E tests at 375px, 768px, desktop. Run typecheck, lint, unit tests, full E2E, production build, PWA validation, and local production smoke test. Inspect screenshots; document migration activation and any unverified hosted behavior.

## Results
- Typecheck, lint, build, PWA and SEO validation: passed.
- Unit tests: 46 passed; hosted RLS integration test intentionally skipped without service-role test credentials.
- Isolated native Postgres: all migrations and 22 populated goal ownership, integrity, retry, and deletion checks passed; temporary database stopped and removed.
- Production-server E2E: 60 passed across mobile, tablet, desktop, including real offline shell reloads, all languages/themes, focus trapping, export, and account deletion.
- Fixed a production autofocus race by focusing in a layout effect, and cleared deleted-account tokens before exposing login.
- Prevented shared service-worker caching of Supabase finance/auth responses; cache version v4 removes prior caches.
- Local production smoke: home, goals, settings, callback, manifest, worker, icon returned HTTP 200.
- No Git commit/push, Vercel deployment, or hosted migration application performed.
