# Walletly Production Hardening Implementation Plan

> **For agentic workers:** Execute this plan inline in the current session. Do not commit, push, or deploy during this task.

**Goal:** Harden Walletly for production locally by completing Supabase auth configuration support, reliable Web Push reminders, privacy-safe monitoring, browser E2E coverage, and personal income/budget tracking.

**Architecture:** Extend the existing local-first `PersistedAppData` and offline queue for income and budgets. Store Web Push subscriptions and reminder preferences in Supabase with owner-only RLS; a Supabase Edge Function sends VAPID Web Push notifications using server-only secrets. Keep monitoring optional and scrubbed, and use Playwright for deterministic local E2E tests with hosted tests gated by dedicated test-project environment variables.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase JS, Supabase SQL migrations/RLS, Supabase Edge Functions, Web Push/VAPID, Playwright, Node test runner, npm audit.

## Global Constraints

- No `git commit`, `git push`, or `vercel deploy` in this task.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, VAPID private keys, or monitoring auth tokens to the browser.
- Preserve offline-first mutations and existing demo mode.
- All new persisted user tables must have RLS and ownership predicates.
- Notification permission is requested only after the user enables reminders.
- Hosted auth/RLS tests use a dedicated test Supabase project, never production data.

### Task 1: Auth Environment and Hosted-Test Contract

**Files:**
- Modify: `.env.example`
- Modify: `src/lib/supabase.ts`
- Modify: `tests/rls.integration.test.ts`
- Create: `scripts/validate-auth-config.mjs`
- Modify: `package.json`
- Modify: `docs/supabase-provider-setup.md`

**Interfaces:**
- `getAuthRedirectUri()` continues to return `NEXT_PUBLIC_AUTH_REDIRECT_URL` when set, otherwise the current origin callback.
- Hosted RLS tests accept `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `npm run auth:validate` exits non-zero for placeholder production URL, missing callback path, or service-role keys exposed through `NEXT_PUBLIC_*`.

- [ ] **Step 1: Add auth validation coverage**
  Add a script that reads environment variables without printing secret values, validates HTTPS production URLs, and checks that localhost, preview, and production callback values end in `/auth/callback`.
- [ ] **Step 2: Normalize hosted RLS variables**
  Replace the legacy `EXPO_PUBLIC_*` reads and skip message in `tests/rls.integration.test.ts` with the Next.js names while accepting the legacy names only as a compatibility fallback.
- [ ] **Step 3: Document Supabase and Google configuration**
  Document exact Site URL, redirect URLs, Supabase Google callback URL, Google OAuth consent setup, and magic-link verification steps for localhost, preview, and production.
- [ ] **Step 4: Run focused verification**
  Run `npm run auth:validate` and the hosted test with no secrets to confirm safe skipping; run `npm run typecheck` and `npm run lint`.

### Task 2: Income and Monthly Budgets

**Files:**
- Create: `supabase/migrations/202610020003_income_budgets.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/lib/offline-sync.ts`
- Modify: `src/components/walletly-app.tsx`
- Modify: `src/lib/i18n.ts`
- Create: `tests/income-budget.test.ts`
- Modify: `supabase/tests/rls.sql`

**Interfaces:**
- `IncomeEntry = { id, userId, amount, currency, receivedAt, note, deletedAt, updatedAt }`.
- `Budget = { id, userId, month, amount, currency, deletedAt, updatedAt }`.
- Store methods: `saveIncome(entry, id?)`, `deleteIncome(id)`, `saveBudget(budget, id?)`, `deleteBudget(id)`.
- `PersistedAppData` includes `incomeEntries` and `budgets`; sync table union includes `income_entries` and `budgets`.

- [ ] **Step 1: Add failing domain tests**
  Cover month filtering, income minus expenses, budget remaining, soft deletion, and rejection of zero/negative amounts.
- [ ] **Step 2: Add migration and RLS**
  Create both tables with numeric checks, ownership policies, indexes, timestamps, and a unique active budget per `(user_id, month, currency)`.
- [ ] **Step 3: Add mappings and offline persistence**
  Extend row mappers, initial state, user scoping, remote pull, offline queue, and sync flushing for the two new tables.
- [ ] **Step 4: Implement store mutations**
  Add optimistic local save/delete methods that enqueue authenticated mutations and persist demo data locally.
- [ ] **Step 5: Replace disabled Insights content**
  Add a compact income/budget editor and summary using the existing Walletly visual language; preserve empty states and currency separation.
- [ ] **Step 6: Localize and test**
  Add English, Russian, and Uzbek strings and run `node --test tests/income-budget.test.ts`, `npm run typecheck`, and `npm run lint`.

### Task 3: Web Push Subscriptions and Cron Reminders

**Files:**
- Create: `supabase/migrations/202610020004_push_reminders.sql`
- Modify: `src/lib/notifications.ts`
- Modify: `src/components/walletly-app.tsx`
- Modify: `public/sw.js`
- Modify: `supabase/functions/daily-reminders/index.ts`
- Modify: `.env.example`
- Modify: `docs/next-pwa-deployment.md`
- Create: `tests/notifications.test.ts`

**Interfaces:**
- Browser uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to call `pushManager.subscribe` after permission is granted.
- `registerPushSubscription()` and `unregisterPushSubscription()` upsert/delete the authenticated user’s subscription row.
- Edge Function reads `WALLETLY_VAPID_PRIVATE_KEY`, `WALLETLY_VAPID_SUBJECT`, and service-role credentials only from Edge Function secrets.
- Service worker handles `push` and `notificationclick`, with click data defaulting to `/add-expense`.

- [ ] **Step 1: Add subscription and preference schema**
  Create owner-scoped tables and grants for endpoint/key material, timezone, local time, enabled state, and cleanup timestamps.
- [ ] **Step 2: Add browser registration lifecycle**
  Register after the existing Settings action succeeds, persist the subscription remotely, handle denied permission and unsupported browsers, and delete on disable.
- [ ] **Step 3: Implement service-worker push handling**
  Render generic privacy-safe reminder copy and route notification clicks to `/add-expense`.
- [ ] **Step 4: Implement Edge Function delivery**
  Query due preferences in the user’s timezone, skip users with an expense for the local day, send Web Push, and remove expired subscriptions. Reject unauthenticated invocation unless the cron secret is present.
- [ ] **Step 5: Document cron and secrets**
  Add the exact Supabase secret names, VAPID generation command, function deploy command, and `pg_cron` schedule example without committing secret values.
- [ ] **Step 6: Test the lifecycle**
  Add unit tests for permission denial, subscription absence, click routing, and due-user filtering.

### Task 4: Production Error Monitoring and Dependency Hygiene

**Files:**
- Modify: `src/lib/error-reporting.ts`
- Create: `src/app/global-error.tsx`
- Modify: `src/components/providers.tsx`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/monitoring.md`

**Interfaces:**
- `reportError(error, { surface })` remains the application boundary and removes emails, numbers, notes, tags, and raw Supabase payloads.
- Monitoring is disabled when `NEXT_PUBLIC_SENTRY_DSN` is absent and cannot block the app when the service is unavailable.

- [ ] **Step 1: Audit dependency vulnerabilities**
  Run `npm audit --omit=dev`, identify direct versus transitive issues, and update only compatible packages or pin safe overrides with a written reason.
- [ ] **Step 2: Add optional Sentry integration**
  Install the compatible Sentry package, configure browser/server/edge hooks, and keep DSN/project auth values out of client-visible variables except the public DSN.
- [ ] **Step 3: Wire uncaught error surfaces**
  Report global render errors and existing store/auth failures through the sanitized boundary.
- [ ] **Step 4: Verify privacy and build**
  Add tests for redaction, run `npm audit`, `npm run build`, and document source-map/release setup.

### Task 5: Playwright E2E Coverage

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/auth-callback.spec.ts`
- Create: `tests/e2e/expense-lifecycle.spec.ts`
- Create: `tests/e2e/offline-sync.spec.ts`
- Create: `tests/e2e/export-delete.spec.ts`
- Create: `tests/e2e/pwa.spec.ts`
- Modify: `package.json`
- Create: `docs/e2e.md`

**Interfaces:**
- `npm run e2e` starts or uses `E2E_BASE_URL` and runs deterministic local tests.
- Hosted auth/RLS tests are enabled only with `E2E_SUPABASE_*` variables and a pre-created test identity.

- [ ] **Step 1: Configure Playwright**
  Use Chromium, mobile 375px and desktop projects, trace-on-first-retry, and a web server on port 3100 to avoid the user’s running port 3000 session.
- [ ] **Step 2: Test auth callback contract**
  Verify callback route handles missing code, provider errors, and successful mocked exchange without exposing credentials.
- [ ] **Step 3: Test expense and offline flows**
  Cover add/edit/delete, search/filter, offline mutation queue, reconnect flush, and recovery state using demo mode and mocked network requests.
- [ ] **Step 4: Test export and deletion**
  Verify JSON/CSV download names, confirmation UI, local data removal, and logged-out state.
- [ ] **Step 5: Test installability**
  Verify manifest, icons, service worker registration, install prompt behavior, notification click route, and responsive layout.
- [ ] **Step 6: Run the suite**
  Run `npx playwright install chromium` when needed, then `npm run e2e` and save failures as actionable output without committing artifacts.

### Task 6: Full Verification and Local Handoff

**Files:**
- Modify: `docs/production-readiness.md`
- Modify: `docs/release-checklist.md`

- [ ] **Step 1: Run all checks**
  Run `npm run auth:validate`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`, `npm run pwa:validate`, `npm run seo:validate`, `npm run build`, and `git diff --check`.
- [ ] **Step 2: Smoke-test production mode locally**
  Start `npm start` on an unused port and verify `/`, `/auth/callback`, `/manifest.webmanifest`, `/sw.js`, `/robots.txt`, and `/sitemap.xml` return 200.
- [ ] **Step 3: Verify responsive behavior**
  Exercise 375px, 768px, and 1280px light/dark screens and confirm income/budget, reminders, auth, offline, export, and deletion flows.
- [ ] **Step 4: Update handoff documentation**
  Record exact manual Supabase dashboard steps, secrets still required, test results, dependency audit status, and the fact that no commit or deployment was performed.
