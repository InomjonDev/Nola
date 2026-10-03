# Walletly Magic-Link Authentication Design

**Status:** Approved for local implementation on 2026-10-03.

**Supersedes:** `2026-10-03-walletly-email-otp-design.md`.

## Goal

Replace Walletly's verification-code interface with link-only Supabase email authentication. Existing users receive a sign-in link, new users receive a confirmation link, and both links create a Walletly session without asking the user to enter a code. The link must work when opened in a different browser or device from the one that requested it.

## Chosen Approach

Walletly continues to request passwordless email authentication with `signInWithOtp`, because that is Supabase's API for both magic links and email codes. The request includes `shouldCreateUser: true` and an `emailRedirectTo` pointing to Walletly's `/auth/confirm` route.

Both Supabase email templates build their primary link as `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`. The `/auth/confirm` page exchanges that token hash with `verifyOtp({ token_hash, type: "email" })`, persists the returned Supabase session in the current browser, and returns the user to `/`. This avoids dependence on the PKCE verifier stored in the browser that originally requested the message.

Google OAuth remains unchanged and continues to use `/auth/callback` with PKCE code exchange.

## Authentication Experience

The signed-out surface has two email states:

1. The initial state contains Google sign-in, an email field, Send sign-in link, and local demo.
2. After Supabase accepts the request, Walletly shows a compact Check your inbox state with the destination address, an instruction to open the secure link, Resend link, and Use a different email.

There is no verification-code field, code countdown, code autofill, or client-side code persistence. Supabase remains authoritative for request throttling and link expiration. Known rate-limit, offline, and delivery failures are mapped to localized messages without exposing raw provider errors or revealing whether an account already exists.

## Link Verification Route

`/auth/confirm` is a client route because the existing Supabase client stores browser sessions in local storage. It accepts only a non-empty `token_hash` and the `email` verification type. While verification is in progress it shows a localized finishing-sign-in state. On success it replaces the route with `/`; on failure it shows an expired-or-invalid-link message and a link back to Walletly.

The route never logs, persists, or forwards the token hash. Browser history is replaced after success so the token-bearing URL is removed from the visible navigation history.

## Email Templates

Walletly provides two premium, table-based HTML templates:

- `confirmation.html` for a newly created account.
- `magic_link.html` for an existing account.

Both use a clear Walletly wordmark, restrained neutral/green styling, one primary Continue to Walletly button, a short expiration notice, and a security notice. Their button target is exactly `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`; neither template contains the code-oriented `{{ .Token }}` variable. They remain readable when images, remote fonts, and CSS media queries are unavailable.

The hosted Supabase project must receive both templates through the Dashboard or Management API. Production delivery still requires custom SMTP from a verified Walletly sender domain.

## Localization

English, Russian, and Uzbek Latin cover Send sign-in link, Sending, Check your inbox, link sent, Open email, Resend link, Use a different email, rate limit, offline, send failure, finishing sign-in, invalid or expired link, and Back to Walletly. The email templates ship in English for the initial release because Supabase Auth does not select these shared templates from Walletly's client-language setting.

## Repository Changes

- Replace send/verify-code adapter methods with a send-magic-link method.
- Remove OTP timing, parsing, error, UI, CSS, and unit-test modules.
- Simplify the app-store authentication contract to send a link.
- Replace the two-step code UI with an inbox state.
- Add `/auth/confirm` token-hash verification while preserving `/auth/callback` for Google.
- Replace OTP templates and configuration with Confirm Signup and Magic Link templates.
- Update auth validation, verification scripts, localization, deployment documentation, migration notes, release checklist, and browser tests.

## Verification

Unit tests continue to enforce complete localization and no OTP-only helper remains. Browser tests cover link request, inbox state, resend, successful token-hash verification into onboarding, invalid or expired links, and the existing Google callback error state on mobile and desktop.

Before completion, run typecheck, lint, unit tests, the full Playwright suite, auth configuration validation, Google callback verification, PWA and SEO validation, the production build, and a fresh production-server smoke test. Real email delivery and click-through remain a hosted manual check requiring an authorized test mailbox and the hosted Supabase templates.

## Release Boundary

This task changes local files only. It does not commit, push, deploy to Vercel, modify the hosted Supabase project, or configure SMTP credentials. The final handoff must identify the exact hosted templates and redirect URL that still need to be applied.
