# Walletly Rate Limits and Email-Link Expiry Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 30-minute server-enforced email-link lifetime, Resend SMTP release configuration, accurate auth throttling UX, and bounded action/sync rates without slowing offline data entry.

**Architecture:** Supabase remains authoritative for authentication limits and token expiry. A pure browser-side helper provides privacy-preserving cooldown and rolling-window calculations for UX, while the existing sync queue gains a bounded paced flush. Resend is documented as hosted SMTP configuration; no credentials or hosted mutations are added locally.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase JS 2, Node test runner, Playwright.

## Global Constraints

- Email-link expiry is exactly 1800 seconds.
- Email requests have a 60-second device cooldown stored without an email address.
- Production Supabase email delivery starts at 30 messages per hour with Resend SMTP.
- Local expense, income, budget, category, tag, and payment edits remain immediate and offline-first.
- Do not commit, push, deploy, mutate hosted Supabase, configure Resend, or expose credentials.
- Preserve unrelated worktree changes.

---

### Task 1: Pure Rate-Limit Helpers

**Files:**
- Create: `src/lib/action-rate-limit.ts`
- Create: `tests/action-rate-limit.test.ts`

**Interfaces:**
- Produces: `secondsUntil(deadline: number, now?: number): number`
- Produces: `parseStoredDeadline(value: string | null, now?: number): number`
- Produces: `formatShortCountdown(seconds: number): string`
- Produces: `consumeRollingWindow(events: number[], now: number, limit: number, windowMs: number): RollingWindowResult`

- [ ] Write failing boundary tests for expired/malformed deadlines, ceiling retry seconds, countdown formatting, allowed events, and a full rolling window.
- [ ] Implement the pure helpers with finite-number validation and no browser APIs.
- [ ] Run `npm test` and confirm the new tests pass.

### Task 2: Email Cooldown and Accurate Auth Errors

**Files:**
- Modify: `src/components/walletly-app.tsx`
- Modify: `src/lib/i18n.ts`
- Modify: `tests/e2e/email-magic-link.spec.ts`

**Interfaces:**
- Consumes: rate-limit helpers from Task 1.
- Stores: `walletly.auth.magicLinkNextAllowedAt` as a timestamp only.
- Produces: localized `emailTemporarilyLimited`, `tooManyRequests`, and `sendLinkIn` states.

- [ ] Add E2E coverage for a successful first request, persisted cooldown after reload, disabled request/resend controls, and distinct `over_email_send_rate_limit` and `over_request_rate_limit` messages.
- [ ] Start the 60-second cooldown only after Supabase accepts the request.
- [ ] Restore and tick the cooldown after refresh without storing the destination email.
- [ ] Replace generic 429 classification with exact Supabase error-code handling and safe fallbacks.
- [ ] Update EN/RU/UZ copy to state a 30-minute link lifetime.
- [ ] Run focused typecheck, localization tests, and email-link E2E tests.

### Task 3: Export, Deletion, and Sync Boundaries

**Files:**
- Modify: `src/components/walletly-app.tsx`
- Modify: `src/lib/offline-sync.ts`
- Create: `tests/offline-sync.test.ts`
- Modify: `tests/e2e/export-delete.spec.ts`
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Export consumes: `consumeRollingWindow(..., limit=5, windowMs=60000)`.
- Sync produces: at most 25 completed operations per call with 100ms pacing between successful remote mutations.
- Account deletion produces: one in-app confirmation and one active deletion request.

- [ ] Test rolling export rejection and bounded/paced sync with injected test send/sleep functions.
- [ ] Add five-per-minute export guarding with localized feedback.
- [ ] Replace the native account-deletion confirm with an accessible in-app dialog.
- [ ] Disable account-deletion actions while the request is active and surface a localized failure.
- [ ] Bound each sync pass to 25 operations and add 100ms pacing while preserving three exponential retries.
- [ ] Update E2E coverage and run focused tests.

### Task 4: Supabase and Resend Configuration

**Files:**
- Modify: `supabase/config.toml`
- Modify: `supabase/templates/confirmation.html`
- Modify: `supabase/templates/magic_link.html`
- Modify: `scripts/validate-auth-config.mjs`
- Modify: `docs/supabase-provider-setup.md`
- Modify: `docs/next-pwa-deployment.md`
- Modify: `docs/production-readiness.md`
- Modify: `docs/release-checklist.md`

**Interfaces:**
- Config sets: `otp_expiry = 1800`, `max_frequency = "1m"`, email/hour `30`, sign-in/signup `30`, token verification `30`, and refresh `150`.
- Hosted handoff specifies `smtp.resend.com:465`, user `resend`, server-only API key password, Walletly sender, and verified domain address.

- [ ] Update local Supabase values and validate every exact limit.
- [ ] Change app and email-template expiry copy from 10 to 30 minutes.
- [ ] Document Resend custom SMTP, verified sender requirements, Dashboard rate limits, and the no-secret rule.
- [ ] Run `npm run auth:validate` and a stale-copy scan for ten-minute or 600-second policy text.

### Task 5: Complete Verification

**Files:**
- Modify only files required by failures found during verification.

- [ ] Run `npm install`, typecheck, lint, unit tests, auth/PWA/SEO validation, and the full Playwright suite.
- [ ] Run `npm audit --omit=dev --audit-level=high` and `npm run build`.
- [ ] Start production mode on an unused port and confirm `/`, `/auth/callback`, `/auth/confirm`, `/manifest.webmanifest`, and `/sw.js` return HTTP 200.
- [ ] Restart localhost development mode if the production build invalidates its cache.
- [ ] Report exact changed files and remaining hosted Resend/Supabase steps without committing, pushing, or deploying.
