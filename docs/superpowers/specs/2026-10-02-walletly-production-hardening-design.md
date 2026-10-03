# Walletly Production Hardening Design

**Status:** Approved for local implementation on 2026-10-02.

## Goal

Make the Next.js Walletly PWA production-ready without publishing or committing during this task: validate Supabase authentication across environments, deliver reliable closed-app reminders, add privacy-safe monitoring, expand browser E2E coverage, and replace the disabled Insights income panel with personal income and budget tracking.

## Architecture

The browser remains a local-first client. Expense, income, and budget mutations update the local account snapshot immediately and enter the existing offline sync queue; authenticated Supabase clients reconcile rows by `client_updated_at` and RLS ownership. Web Push subscriptions and reminder preferences are separate authenticated tables, while the `daily-reminders` Edge Function uses service-role access only on the server and VAPID secrets only in Edge Function secrets.

Production error reporting is optional and privacy-scrubbed. Playwright tests run against a local development server for deterministic demo/offline/PWA workflows, with a separately gated hosted-auth/RLS suite that requires a dedicated test Supabase project. No production account, Google account, or service-role credential is used by E2E tests.

## Scope

- Keep all current changes uncommitted and do not run `vercel deploy`.
- Preserve Supabase RLS and add ownership policies for all new user data.
- Use monthly personal budgets and dated income entries; shared budgets and bank sync remain out of scope.
- Request notification permission only from the existing Settings action.
- Do not claim that browser timers deliver notifications while the app is closed.

## Data Model

- `income_entries`: user-owned amount, currency, received date, note, soft-delete, client/update timestamps.
- `budgets`: user-owned currency, month key, total amount, soft-delete, client/update timestamps; unique per user and month/currency.
- `push_subscriptions`: user-owned Web Push endpoint and encrypted-key material, with last-seen timestamp.
- `reminder_preferences`: one row per user with enabled flag, IANA timezone, local reminder time, and update timestamp.

## Verification

Every slice runs focused unit tests plus `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, PWA/SEO validators, and a production-server smoke check before this task is considered complete. Hosted Supabase checks run only when the required test-project variables are present.
