# Savings Goals

Goals live in **Insights > Goals** (`/insights?tab=goals`). Home previews up to two active goals without combining currencies. Savings are manually recorded deposits and withdrawals, independent of income, expenses, budgets, and real bank transfers.

## Behavior

- Name, positive target, supported currency, Lucide icon, optional calendar deadline.
- Progress is calculated from contribution records in integer cents; a stable UUID identifies every contribution. Repeated upserts cannot count a deposit twice.
- Currency locks after the first contribution. Metadata can still be edited, including the target and deadline.
- Reached is derived from the balance, not stored as a competing status. Increasing the target or withdrawing savings can reopen progress. Passing a deadline never blocks contributions.
- A new savings deposit that takes an active goal from below target to reached triggers one short confetti burst and an archive prompt. The prompt offers Archive and Keep active; archiving moves to the archived filter, and keeping it active will not repeat the prompt on reload. Editing a target or recording a withdrawal does not trigger the celebration. Confetti is suppressed for reduced-motion preferences.
- Archived goals remain available in the archive and in exports. Reopening preserves their history. Goal deletion is a syncable tombstone; deleted goals and their contributions disappear from the UI and exports. Account deletion physically cascades through both tables.
- The device rejects withdrawals above its known balance. Separate offline devices can still withdraw against the same balance; after merge, a negative balance is shown explicitly rather than hidden or clamped. Resolve it by reviewing history and adding missing savings.
- Existing sync errors are surfaced on the goals view. Local/demo tracking works without a database migration; cloud tracking needs the schema below.
- The service worker caches only same-origin shell/static responses, excluding authenticated requests and auth/API routes. It does not cache Supabase financial responses. Cache version v4 retires older shared caches.

## Database Activation

Prepared migration: `supabase/migrations/20261005160939_savings_goals.sql`. It has **not** been applied to hosted Supabase.

Review and apply it with the other pending migrations through the project's normal Supabase release process. Before deploying the web feature, confirm the linked project, take a backup, apply pending migrations, and run the two-user hosted test with disposable test credentials. Do not configure a service-role key as a `NEXT_PUBLIC_` variable.

The migration enables owner RLS and explicit authenticated-only grants on `savings_goals` and `goal_contributions`. A composite foreign key requires contributions to match their parent's owner and currency. Financial contribution fields are immutable; idempotent retries, note updates, and tombstones remain valid. There are no new privileged RPCs or Edge Functions.

## Exports

JSON adds `savingsGoals` and `goalContributions`. CSV preserves its original first eight columns and appends `goal_id,name,target_amount,deadline,archived_at,icon,kind`. Goal rows use type `savings_goal`; history rows use `goal_contribution`, with positive amounts and an explicit `deposit`/`withdrawal` kind. User-authored spreadsheet formulas are prefixed with an apostrophe in CSV only.

## Verification Commands

```sh
npm run typecheck
npm run lint
npm test
npm run test:goals:db
npm run e2e
npm run build
npm run pwa:validate
```

`test:goals:db` requires native Postgres tools (`pg_config`, `initdb`, `pg_ctl`, `psql`). It creates a temporary, Unix-socket-only cluster, applies all migrations, uses a minimal local Supabase-auth shim, runs populated RLS/constraint/cascade tests, then stops and removes only that temporary cluster. It never connects to the hosted project or an existing local database.

`supabase/tests/savings_goals.sql` can also be run using `psql -v ON_ERROR_STOP=1 -f supabase/tests/savings_goals.sql` against a migrated **local test database**. It rolls back its fixtures. `npm run test:rls` is the separate hosted integration suite; it needs test environment variables and creates/deletes disposable users.

The E2E cloud tests mock Supabase and exercise real application queue behavior, including response-loss retries. They do not establish that hosted migration activation or live OAuth is working. Responsive tests cover 375px mobile, 768px tablet, desktop, all three languages, both themes, keyboard focus, calendar touch targets, and reduced motion.

Verified locally: 46 unit tests passed, 22 isolated Postgres checks passed, and all 60 E2E tests passed against the production server. Typecheck, lint, build, PWA/SEO validation, and HTTP smoke checks passed. The hosted RLS test was skipped without service-role test credentials. The existing Next.js ESLint-plugin configuration warning remains; the separate lint command passes.

## Release Boundaries

No automatic allocations, conversion, goal notifications, hosted migration application, Git commit, or Vercel deployment are part of this local implementation.

## Exact Files Changed

```text
.gitignore
docs/savings-goals.md
docs/superpowers/plans/2026-10-05-savings-goals.md
package.json
public/sw.js
scripts/test-goals-db.mjs
src/app/globals.css
src/components/savings-goals.tsx
src/components/walletly-app.tsx
src/lib/app-store.tsx
src/lib/export-data.ts
src/lib/i18n.ts
src/lib/mappers.ts
src/lib/offline-sync.ts
src/lib/savings-goals.ts
src/lib/types.ts
supabase/migrations/20261005160939_savings_goals.sql
supabase/tests/savings_goals.sql
tests/e2e/savings-goals.spec.ts
tests/offline-sync.test.ts
tests/rls.integration.test.ts
tests/savings-goals-export.test.ts
tests/savings-goals.test.ts
tests/service-worker-cache.test.ts
```
