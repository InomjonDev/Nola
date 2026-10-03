# Walletly Email OTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Walletly's email magic link with a localized six-digit Supabase email OTP that has an authoritative ten-minute expiry and a premium transactional email.

**Architecture:** Keep Supabase Auth as the security boundary. A small pure helper module owns OTP normalization, timing, persistence parsing, and error classification; the Supabase adapter sends and verifies codes; the app store exposes those operations; and the auth screen owns only the two-step interaction state. Hosted email and expiry settings are represented locally and documented for manual application.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Supabase JS 2, Node test runner, Playwright.

## Global Constraints

- Existing Google OAuth and `/auth/callback` behavior must remain unchanged.
- Email codes contain exactly 6 digits and expire after 600 seconds on Supabase and in the visible countdown.
- The same code flow signs in existing users and creates new users.
- English, Russian, and Uzbek Latin must contain every new interface string.
- No service-role key, SMTP credential, or Management API token may enter client code or Git.
- Do not commit, push, deploy to Vercel, or modify the hosted Supabase project during this task.
- Preserve all existing uncommitted user work.

---

### Task 1: Pure OTP State And Timing

**Files:**
- Create: `src/lib/email-otp.ts`
- Create: `tests/email-otp.test.ts`

**Interfaces:**
- Produces: `EMAIL_OTP_LENGTH`, `EMAIL_OTP_LIFETIME_MS`, `EMAIL_OTP_RESEND_DELAY_MS`, `EMAIL_OTP_SESSION_KEY`, `PendingEmailOtp`, `normalizeEmail`, `sanitizeEmailOtp`, `isCompleteEmailOtp`, `createPendingEmailOtp`, `parsePendingEmailOtp`, `secondsUntil`, `formatOtpCountdown`, and `classifyEmailOtpError`.

- [ ] **Step 1: Write failing helper tests**

```ts
test("email OTP helpers normalize input and enforce six digits", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(sanitizeEmailOtp("12a 34-567"), "123456");
  assert.equal(isCompleteEmailOtp("123456"), true);
  assert.equal(isCompleteEmailOtp("12345"), false);
});

test("pending OTP state has a ten-minute expiry and survives parsing", () => {
  const pending = createPendingEmailOtp("person@example.com", 1_000);
  assert.equal(pending.expiresAt, 601_000);
  assert.equal(parsePendingEmailOtp(JSON.stringify(pending))?.email, "person@example.com");
  assert.equal(formatOtpCountdown(600), "10:00");
});
```

- [ ] **Step 2: Run `npm test -- tests/email-otp.test.ts` and confirm the missing-module failure**

- [ ] **Step 3: Implement the pure helpers**

```ts
export const EMAIL_OTP_LENGTH = 6;
export const EMAIL_OTP_LIFETIME_MS = 10 * 60 * 1000;
export const EMAIL_OTP_RESEND_DELAY_MS = 60 * 1000;
export const EMAIL_OTP_SESSION_KEY = "walletly.pendingEmailOtp";

export type EmailOtpErrorKind = "offline" | "rate-limit" | "expired" | "invalid" | "unauthorized-email" | "unknown";
export type PendingEmailOtp = { email: string; expiresAt: number; resendAt: number };

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeEmailOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH);
}
```

Complete the module with defensive JSON parsing, ceiling-based seconds, `MM:SS` formatting, and Supabase error-code classification for `over_email_send_rate_limit`, `otp_expired`, `otp_disabled`, and invalid-token responses.

- [ ] **Step 4: Re-run the focused unit test and confirm it passes**

- [ ] **Step 5: Run `npm test` to confirm no helper regression**

### Task 2: Supabase And Store Authentication Contract

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/app-store.tsx`

**Interfaces:**
- Consumes: `normalizeEmail` and `sanitizeEmailOtp` from Task 1.
- Produces: `sendEmailOtp(email: string): Promise<string>` and `verifyEmailOtp(email: string, token: string): Promise<void>` on `StoreValue`.

- [ ] **Step 1: Replace the magic-link adapter with explicit send and verify operations**

```ts
export async function sendEmailOtp(email: string) {
  if (!supabase) throw new Error("Add Supabase credentials to .env.local before using email authentication.");
  const normalizedEmail = normalizeEmail(email);
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return normalizedEmail;
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!supabase) throw new Error("Add Supabase credentials to .env.local before using email authentication.");
  const result = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token: sanitizeEmailOtp(token),
    type: "email",
  });
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error("Email verification completed without a session.");
}
```

- [ ] **Step 2: Rename the app-store email method and add verification**

```ts
type StoreValue = PersistedAppData & {
  sendEmailOtp: (email: string) => Promise<string>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
};
```

Delegate both methods to `src/lib/supabase.ts`; leave account activation with the existing `onAuthStateChange` subscription.

- [ ] **Step 3: Run `npm run typecheck` and confirm all old `signInEmail` callers are identified**

### Task 3: Localized Two-Step OTP Interface

**Files:**
- Modify: `src/components/walletly-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/i18n.ts`
- Modify: `tests/i18n.test.ts`
- Create: `tests/e2e/email-otp.spec.ts`

**Interfaces:**
- Consumes: OTP helpers from Task 1 and app-store methods from Task 2.
- Produces: a two-step `AuthScreen` with semantic forms, custom six-cell input, persistent countdown, resend, change-email, and accessible status messages.

- [ ] **Step 1: Replace magic-link translation keys in all three languages**

Add exact keys for `auth.email`, `auth.sendCode`, `auth.codeSent`, `auth.verificationCode`, `auth.verify`, `auth.verifying`, `auth.expiresIn`, `auth.expired`, `auth.resend`, `auth.resendIn`, `auth.changeEmail`, `auth.invalidCode`, `auth.rateLimited`, `auth.offline`, `auth.sendCodeError`, and `auth.verifyCodeError`. Keep copy concise and do not display raw Supabase errors.

- [ ] **Step 2: Build a focused `OtpCodeInput` inside the existing component module**

```tsx
function OtpCodeInput({ value, onChange, disabled, label }: OtpCodeInputProps) {
  return (
    <div className="otp-input-wrap">
      <input
        aria-label={label}
        autoComplete="one-time-code"
        className="otp-native-input"
        disabled={disabled}
        inputMode="numeric"
        maxLength={EMAIL_OTP_LENGTH}
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(sanitizeEmailOtp(event.target.value))}
      />
      <div aria-hidden="true" className="otp-cells">
        {Array.from({ length: EMAIL_OTP_LENGTH }, (_, index) => (
          <span className="otp-cell" key={index}>{value[index] ?? ""}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement the email and verification state machine**

On send success, save `createPendingEmailOtp(normalizedEmail)` to session storage and show the code step. Tick against `Date.now()` every second rather than decrementing local state. On expiry, clear the code and disable verification. On resend success, replace the pending record and clear the code. On successful verification, remove the pending record and let the existing auth listener transition the app. On Change email, clear all pending state and return to the email step.

- [ ] **Step 4: Add OTP visual states**

Use six stable equal-width cells with responsive gaps, a shared focus ring from the transparent semantic input, tabular numerals, restrained accent color, and no layout shift between empty and filled states. Keep all controls at least 44px and disable motion under `prefers-reduced-motion`.

- [ ] **Step 5: Add mocked browser coverage**

Intercept `/auth/v1/otp` to assert the email step transitions to the code step. Intercept `/auth/v1/verify` for an invalid-code response and assert localized inline feedback. Seed `walletly.pendingEmailOtp` through `addInitScript` with a near-term expiry and assert the expired state without waiting ten minutes. Run both Playwright projects.

- [ ] **Step 6: Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run e2e -- tests/e2e/email-otp.spec.ts`**

### Task 4: Supabase OTP Configuration And Premium Email

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/templates/magic_link.html`
- Modify: `scripts/validate-auth-config.mjs`
- Modify: `scripts/verify-auth-routes.mjs`
- Modify: `.env.example`

**Interfaces:**
- Produces: local six-digit/600-second Auth configuration, a copy-ready hosted email template, static validation, and an optional real-mailbox verification path.

- [ ] **Step 1: Add local Supabase Auth settings**

```toml
[auth.email]
max_frequency = "1m"
otp_length = 6
otp_expiry = 600

[auth.email.template.magic_link]
subject = "Your Walletly verification code"
content_path = "./supabase/templates/magic_link.html"
```

- [ ] **Step 2: Create the branded HTML email**

Use a table layout, inline styles, a hidden preheader, a text Walletly mark, one neutral card, `{{ .Token }}` as the only authentication credential, a ten-minute expiry statement, and a security notice. Do not include `{{ .ConfirmationURL }}`, scripts, forms, gradients, or remote fonts.

- [ ] **Step 3: Extend static auth validation**

Read `supabase/config.toml` and `supabase/templates/magic_link.html`; fail unless the config has `otp_length = 6`, `otp_expiry = 600`, the template contains `{{ .Token }}`, and the template does not contain `{{ .ConfirmationURL }}`.

- [ ] **Step 4: Update hosted verification terminology**

`AUTH_TEST_EMAIL` requests an OTP. Optional `AUTH_TEST_OTP` verifies the received six-digit code with `verifyOtp({ email, token, type: "email" })`; without it, the script clearly reports that delivery was requested but exchange requires the mailbox code.

- [ ] **Step 5: Run `npm run auth:validate` and `npm run auth:verify`**

### Task 5: Documentation And Release Verification

**Files:**
- Modify: `docs/supabase-provider-setup.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/migration-note-next-pwa.md`
- Modify: `docs/next-pwa-deployment.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: exact hosted Supabase and SMTP handoff instructions plus complete release evidence.

- [ ] **Step 1: Document hosted Supabase settings**

Document Auth email OTP length `6`, expiry `600`, the Magic Link/OTP template paste location, the requirement for custom SMTP and a verified sender domain, and the localhost/preview/production test matrix. Explain that local files do not modify the hosted project.

- [ ] **Step 2: Replace magic-link release language**

The checklist must cover first-time signup, existing-user sign-in, incorrect code, expired code, resend, offline handling, restored session, Google OAuth regression, and real delivery through custom SMTP.

- [ ] **Step 3: Run the full verification suite**

```bash
npm run typecheck
npm run lint
npm test
npm run e2e
npm run auth:validate
npm run pwa:validate
npm run seo:validate
npm run build
```

Expected: every command exits `0`; hosted RLS may report its existing documented skip when no service-role test credential is configured.

- [ ] **Step 4: Start the production server on an unused port and smoke test**

Run `npm run start -- --port <unused-port>`, then confirm `/`, `/auth/callback`, `/manifest.webmanifest`, and `/sw.js` return expected successful responses. Confirm the service worker's offline fallback serves the cached `/` app shell; this repository does not define a separate `/offline` route. Stop only the temporary production process, leaving the user's port-3000 development server available.

- [ ] **Step 5: Review the final diff and report the hosted-only actions**

Run `git diff --check` and `git status --short`. Confirm no secret appeared, no unrelated change was reverted, and no commit, push, Vercel deployment, or hosted Supabase mutation occurred.
