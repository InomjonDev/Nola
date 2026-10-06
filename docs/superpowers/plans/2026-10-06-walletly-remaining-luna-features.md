# Walletly Remaining Luna Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the category-budget, recurring-transaction, manual-account, and public-help work that is currently represented only by domain/store scaffolding.

**Architecture:** Complete the existing local-first data model before exposing controls. Add one owned Supabase schema migration with RLS and relationship constraints, then connect offline operations, localized screens, exports, and focused end-to-end tests. Keep these features separate from expense and income totals unless a normal transaction is explicitly created.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres/RLS, existing offline queue and local persistence, Tailwind design tokens, Node test runner, Playwright, Graphify.

## Global Constraints

- Work in `/Users/inomjonismanaliyev/Documents/Codex/2026-09-30/new-chat/outputs/expense-tracker`.
- Preserve existing savings goals, amount formatting, demo seed, and Graphify files.
- Maintain English, Russian, and Uzbek Latin translations for every new visible string.
- Keep mutations local-first, account-scoped, idempotent, and recoverable after reconnect.
- Follow the existing semantic design tokens and custom controls; maintain keyboard accessibility and 44px touch targets.
- Do not apply migrations to hosted Supabase or deploy without explicit release approval; validate migrations locally first.

## Baseline

`src/lib/category-budgets.ts`, `src/lib/recurring.ts`, and `src/lib/accounts.ts` contain initial domain logic. Types, mapper functions, store action implementations, offline queue ordering, unit tests, and richer local demo fixtures are present. The actions are now exposed through the store provider. The following tasks finish user-facing screens, cloud persistence, exports, public routes, and verification. The earlier full plan remains at `docs/superpowers/plans/2026-10-05-walletly-luna-priority-improvements.md`.

### Task 1: Supabase Schema And RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_luna_priority_improvements.sql` using `supabase migration new luna_priority_improvements`.
- Create: `supabase/tests/luna_priority_improvements.sql`.
- Modify: `scripts/test-goals-db.mjs` only if needed to run the added SQL tests.

**Steps:**
- Add `category_budgets`, `recurring_rules`, `accounts`, and `account_adjustments`, with `auth.users` ownership, lifecycle timestamps, validation checks, indexes, and account/currency composite relationships.
- Add nullable `income_entries.account_id`; enforce that linked account ownership and currency match the income row.
- Enable RLS on every new table. Grant only the authenticated role the required operations; write owner-scoped SELECT/INSERT/UPDATE policies with both `USING` and `WITH CHECK` on updates.
- Add SQL tests for cross-user reads/writes, invalid references/currencies, account ownership, and soft deletion.
- Run the repository's isolated local Postgres harness and assert every migration and SQL test passes. Do not use hosted database credentials.

### Task 2: Store And Offline Recovery

**Files:**
- Modify: `src/lib/app-store.tsx`, `src/lib/mappers.ts`, `src/lib/offline-sync.ts`, `src/lib/types.ts`.
- Test: `tests/offline-sync.test.ts`, `tests/rls.integration.test.ts`, and focused store/domain tests.

**Steps:**
- Verify older persisted payloads hydrate missing collections as empty and keep data isolated by user.
- Keep parent sync order as payment methods/accounts/categories/recurring rules before dependent income, expenses, and adjustments.
- Ensure recurring materialization uses stable occurrence IDs, advances only unchanged rules, and cannot duplicate after retries or concurrent tabs.
- Ensure errors from unavailable new tables remain visible and do not block existing Walletly data hydration.
- Run the local SQL suite and mocked client tests; hosted RLS tests may run only when explicit test credentials are supplied.

### Task 3: Category Budgets UI

**Files:**
- Modify: `src/components/walletly-app.tsx` or add `src/components/category-budgets.tsx` and compose it from Insights.
- Modify: `src/lib/i18n.ts`.
- Test: add `tests/e2e/category-budgets.spec.ts`.

**Steps:**
- Add weekly/monthly cadence controls, category and currency selection, and a formatted amount field using `CurrencyAmountInput`.
- Show current-period spend, remaining/over-budget amount, and accessible progress; support edit and delete.
- Use `categoryBudgetStatus` for weekly ISO-week and local-month boundaries; never aggregate different currencies.
- Add complete EN/RU/UZ strings and tests for create/edit/delete, rollover, overspend, and reload persistence.

### Task 4: Recurring Rules UI

**Files:**
- Add or extend `src/components/recurring-rules.tsx` and compose it from Settings or Manage.
- Modify: `src/lib/i18n.ts`, `src/lib/app-store.tsx` only where needed.
- Test: add `tests/e2e/recurring.spec.ts`.

**Steps:**
- Provide expense/income type, formatted amount, weekly/monthly frequency, start date, and relevant category/payment/account fields using Walletly custom controls.
- List next run and active/archived state; support archive, reopen, and delete.
- Confirm due entries appear exactly once, are editable/deletable as regular transactions, and catch up missed dates without creating more than the domain helper's bounded batch.
- Verify offline creation and reconnect behavior in the browser.

### Task 5: Manual Accounts UI

**Files:**
- Add or extend `src/components/accounts.tsx` and compose it from Manage/Settings.
- Modify: `src/components/walletly-app.tsx`, `src/lib/i18n.ts`.
- Test: add `tests/e2e/accounts.spec.ts`.

**Steps:**
- Create cash, bank, and card accounts with name, currency, and opening balance; display balances from `accountBalance`.
- Allow positive/negative balance adjustments with date and note, plus archive/reopen.
- Allow income to be assigned only to a same-currency account; expenses continue using their linked payment method/account identity.
- Add a compact Home summary and tests for account isolation, currency boundaries, archive behavior, and adjustment persistence.

### Task 6: Exports And Demo Story

**Files:**
- Modify: `src/lib/export-data.ts`, `src/components/savings-goals.tsx` only if account summary composition requires it, `src/components/walletly-app.tsx`.
- Modify: `tests/savings-goals-export.test.ts`; add focused export/demo E2E coverage.

**Steps:**
- Include active and archived category budgets, recurring rules, accounts, and adjustments in JSON and append corresponding entity rows/fields to CSV.
- Continue excluding soft-deleted records and formula-neutralize all user-provided CSV strings.
- Show category budget and account summaries in Insights/Home without counting savings contributions as income.
- Verify the sample demo remains local-only, internally referentially valid, and representative of spending, income, budgets, accounts, recurring rules, and goals.

### Task 7: Public Features And Guides

**Files:**
- Create: `src/app/features/page.tsx`, `src/app/guides/page.tsx`, `src/app/guides/manual-budgeting/page.tsx`.
- Modify: `src/app/sitemap.ts`, `src/lib/seo.ts`, `src/lib/i18n.ts`.
- Test: add `tests/e2e/public-pages.spec.ts`.

**Steps:**
- Build responsive public pages for Walletly's privacy-first PWA, category budgets, recurring entries, manual accounts, insights, export, localization, and offline sync.
- Explain weekly/monthly caps, account adjustments, recurring items, and the absence of bank linking in the budgeting guide.
- Add literal metadata, canonical URLs, sitemap entries, and localized visible copy. Keep the authenticated app shell and existing legal pages unchanged.
- Check mobile/tablet/desktop rendering and internal links with Playwright.

### Task 8: Release Verification

**Files:**
- Modify: `README.md`, `docs/release-checklist.md`.
- Refresh: `graphify-out/` with Graphify commands; never edit generated graph files by hand.

**Steps:**
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:goals:db`, `npm run test:rls`, `npm run build`, `npm run pwa:validate`, and `npm run seo:validate`.
- Run focused E2E specs for budgets, recurring rules, accounts, export, public pages, offline recovery, and PWA at mobile, tablet, and desktop viewports.
- Update docs with implemented scope, local migration/test procedure, and remaining hosted setup. Do not claim hosted RLS or cloud sync verification without real integration credentials and a separately approved migration application.
- Run `graphify update . --no-cluster` followed by `graphify cluster-only . --no-label`, and verify the graph report reflects the final source tree.
