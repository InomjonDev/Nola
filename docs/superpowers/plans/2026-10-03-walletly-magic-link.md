# Walletly Magic-Link Authentication Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Walletly's email verification-code flow with a premium, cross-browser Supabase magic-link flow while preserving Google OAuth.

**Architecture:** `signInWithOtp` requests a Supabase email link whose redirect target is Walletly's `/auth/confirm` route. Both signup-confirmation and existing-user templates include `token_hash` and `type=email`; the receiving browser exchanges the hash with `verifyOtp` and stores its own session. The signed-out UI only requests a link and displays an inbox state.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase JS 2, Playwright, Node test runner.

## Global Constraints

- Keep Google OAuth on `/auth/callback` with its existing PKCE code exchange.
- Email links must work in a browser or device different from the one that requested them.
- Support English, Russian, and Uzbek Latin.
- Do not expose raw Supabase errors or disclose whether an email already has an account.
- Do not commit, push, deploy, or modify the hosted Supabase project.
- Do not remove or revert unrelated worktree changes.

---

### Task 1: Magic-Link Supabase Adapter

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/app-store.tsx`
- Delete: `src/lib/email-otp.ts`
- Delete: `tests/email-otp.test.ts`

**Interfaces:**
- Produces: `getEmailConfirmUri(): string`
- Produces: `sendMagicLink(email: string): Promise<string>`
- Produces: `finishEmailConfirmation(url: string): Promise<Session>`
- Store produces: `sendMagicLink(email: string): Promise<string>`

- [ ] **Step 1: Replace the code-oriented adapter contract**

Normalize email locally, call `signInWithOtp` with `shouldCreateUser: true` and `emailRedirectTo: getEmailConfirmUri()`, then verify a received `token_hash` with `verifyOtp({ token_hash, type: "email" })`.

```ts
export async function sendMagicLink(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: getEmailConfirmUri(), shouldCreateUser: true },
  });
  if (result.error) throw result.error;
  return normalizedEmail;
}
```

- [ ] **Step 2: Remove code verification from the store**

Replace `sendEmailOtp` and `verifyEmailOtp` with one `sendMagicLink` method. Remove imports from `email-otp.ts`, then delete the helper and its unit tests.

- [ ] **Step 3: Run focused static checks**

Run: `npm run typecheck`

Expected: Type errors remain only where the old UI still references the removed OTP contract, proving the adapter boundary changed before the UI.

---

### Task 2: Link-Only UI and Confirmation Route

**Files:**
- Modify: `src/components/walletly-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/i18n.ts`
- Create: `src/app/auth/confirm/page.tsx`
- Create: `src/app/auth/confirm/layout.tsx`
- Modify: `tests/e2e/email-otp.spec.ts` and rename it to `tests/e2e/email-magic-link.spec.ts`

**Interfaces:**
- Consumes: `store.sendMagicLink(email)`
- Consumes: `finishEmailConfirmation(window.location.href)`
- Produces: request form, inbox state, resend action, invalid-link state, and successful redirect to `/`

- [ ] **Step 1: Rewrite browser tests for link behavior**

Cover an accepted request, normalized destination email, resend, `/auth/confirm?token_hash=valid&type=email` exchanging through `/auth/v1/verify`, and an invalid or expired link showing a recoverable error.

```ts
await page.route("**/auth/v1/verify**", async (route) => {
  expect(route.request().postDataJSON()).toMatchObject({ token_hash: "valid", type: "email" });
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeSession(email)) });
});
```

- [ ] **Step 2: Replace the six-cell OTP UI**

Keep the initial Google/email form. After sending, render `Check your inbox`, the normalized address, a concise instruction, `Resend link`, and `Use a different email`. Remove code fields, countdowns, autofill, session storage, and code verification.

- [ ] **Step 3: Add the confirmation route**

Read `token_hash` and `type` from `window.location.href`, reject missing or non-email values, exchange the hash, and use `router.replace("/")` on success. Render localized progress and invalid-link states, and set route metadata to `noindex`.

- [ ] **Step 4: Replace localization keys in all languages**

Add complete EN/RU/UZ copy for send-link, inbox, resend, progress, invalid/expired link, and return actions. Remove all visible code-specific keys.

- [ ] **Step 5: Remove OTP-only CSS**

Delete `.otp-*` selectors and their reduced-motion/mobile overrides. Preserve all unrelated responsive and sheet styles.

- [ ] **Step 6: Run focused verification**

Run: `npm run typecheck && npm run lint && npm test && npx playwright test tests/e2e/email-magic-link.spec.ts tests/e2e/auth-callback.spec.ts`

Expected: all commands pass; the browser test enters onboarding after token-hash verification and Google callback behavior remains covered.

---

### Task 3: Supabase Templates and Local Configuration

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/templates/confirmation.html`
- Modify: `supabase/templates/magic_link.html`
- Modify: `.env.example`
- Modify: `scripts/validate-auth-config.mjs`
- Modify: `scripts/verify-auth-routes.mjs`

**Interfaces:**
- Both email templates produce: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`
- Local Supabase config consumes both template files.
- Auth validation rejects `{{ .Token }}` and requires both token-hash templates.

- [ ] **Step 1: Configure both email message types**

Add local template entries for `auth.email.template.confirmation` and `auth.email.template.magic_link`, preserve the 600-second expiry, and allow both `/auth/callback` and `/auth/confirm` locally.

- [ ] **Step 2: Build premium email-safe templates**

Create restrained table-based HTML for new-account confirmation and existing-user sign-in. Use inline styles, a clear Walletly identity, one primary action, a ten-minute expiry notice, and a security notice. Do not use remote fonts or require images.

- [ ] **Step 3: Update validation and hosted verification scripts**

Validate both templates and both redirect routes. A real mailbox check only sends the link and reports that the user must click it; remove `AUTH_TEST_OTP` and any code exchange from the script.

- [ ] **Step 4: Run auth validation**

Run: `npm run auth:validate`

Expected: `Auth configuration passed for local. Credentials were not printed.`

---

### Task 4: Documentation and Full Release Checks

**Files:**
- Modify: `docs/supabase-provider-setup.md`
- Modify: `docs/next-pwa-deployment.md`
- Modify: `docs/production-readiness.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/migration-note-next-pwa.md`

**Interfaces:**
- Documents the exact hosted redirect URLs and template button target.
- Documents that hosted Supabase configuration and real email delivery remain manual release steps.

- [ ] **Step 1: Replace OTP instructions with magic-link setup**

Document localhost, preview, and production variants for both `/auth/callback` and `/auth/confirm`; distinguish Google OAuth from email confirmation; include both template subjects and the exact token-hash link.

- [ ] **Step 2: Run repository-wide stale-copy scan**

Run: `rg -n "verification code|6-digit|six-digit|AUTH_TEST_OTP|sendEmailOtp|verifyEmailOtp|email-otp|\\{\\{ \\.Token \\}\\}" src tests scripts supabase .env.example docs --glob '!docs/superpowers/specs/2026-10-03-walletly-email-otp-design.md' --glob '!docs/superpowers/plans/2026-10-03-walletly-email-otp.md'`

Expected: no active implementation or release documentation references remain.

- [ ] **Step 3: Run the complete quality suite**

Run: `npm run typecheck && npm run lint && npm test && npm run auth:validate && npm run pwa:validate && npm run seo:validate && npm run e2e && npm run build`

Expected: every command passes.

- [ ] **Step 4: Smoke-test the production server**

Run the built app on an unused local port, request `/`, `/auth/callback`, and `/auth/confirm`, and confirm successful HTTP responses. Stop the server after the check.

- [ ] **Step 5: Report the hosted release boundary**

List the exact changed files, verification results, and remaining hosted tasks: apply both Supabase templates, allow all environment-specific redirect URLs, configure verified custom SMTP, and perform a real mailbox click-through. Do not commit, push, deploy, or mutate hosted settings.
