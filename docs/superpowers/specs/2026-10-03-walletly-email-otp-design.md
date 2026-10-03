# Walletly Email OTP Sign-In Design

**Status:** Approved for local implementation on 2026-10-03.

## Goal

Replace Walletly's unreliable email magic-link experience with a production-ready six-digit email verification code. The same flow signs in existing users and creates new accounts, expires codes after ten minutes on both the server and client, and uses a premium Walletly-branded email. Google OAuth remains unchanged.

## Chosen Approach

Use Supabase Auth's native email OTP flow. Walletly calls `signInWithOtp` with `shouldCreateUser: true`, Supabase generates and emails the code, and Walletly exchanges the submitted code with `verifyOtp({ email, token, type: "email" })`. This keeps code generation, one-time use, abuse controls, account creation, session issuance, and authoritative expiration inside Supabase.

A custom OTP table or Edge Function is out of scope because it would duplicate security-sensitive Auth behavior. A mixed magic-link and code email is also out of scope because link prefetching is the failure mode this change is intended to remove.

## Authentication Experience

The existing auth surface becomes a two-step flow:

1. The email step accepts and normalizes an email address, then sends a code.
2. The verification step displays the destination address, a custom six-cell numeric code control, a Verify button, a persistent `10:00` countdown, Change email, and Resend code.

The code control uses one semantic input with a numeric keyboard and six visual cells. This preserves paste, autofill, screen-reader behavior, and reliable focus while avoiding native system select or dialog UI. Verification can submit automatically after six digits only when no request is already running; the Verify button remains available and has a 44px minimum target.

The absolute expiry timestamp is stored in session storage with the normalized email. Reloading cannot reset the visible countdown. When the timer reaches zero, verification is disabled, the code is cleared, and the interface changes to an expired state. Resend becomes available after Supabase's configured email-request cooldown and starts a fresh ten-minute deadline only after Supabase accepts the request.

Changing the email clears the code, deadline, request messages, and pending verification state. Successful verification relies on the existing Supabase auth-state listener to activate the account and continue to onboarding or the application.

## Server Configuration

Set the hosted Supabase email OTP length to `6` and expiry to `600` seconds. Mirror those values in `supabase/config.toml` for local Supabase development. The browser countdown is presentational; Supabase's server expiry is authoritative.

The Magic Link email template is changed from `{{ .ConfirmationURL }}` to `{{ .Token }}`. Hosted projects receive the template through Supabase Dashboard or the Management API. Production must use custom SMTP from a verified Walletly sender domain because Supabase's default SMTP is restricted and is not intended for production delivery.

No Supabase service-role key, SMTP password, or Management API token is exposed to the browser or committed to the repository.

## Email Design

The repository contains a copy-ready, table-based HTML template compatible with common email clients. It uses a neutral page background, compact Walletly wordmark treatment, restrained green accent, one clear card, a large letter-spaced verification code, a ten-minute expiry notice, and a short security message. It avoids gradients, decorative imagery, remote font dependencies, scripts, forms, and link-based authentication.

The subject identifies Walletly and the purpose of the message without placing the one-time code in notification previews. The template includes an accessible preheader and useful text when images are blocked. The mascot may be used only through a stable production HTTPS asset URL; the email remains complete without it.

## Localization

All in-app states are translated in English, Russian, and Uzbek Latin: send code, code sent, verification code, countdown, verify, verifying, resend, resend wait, change email, incorrect code, expired code, rate limit, send failure, and verification failure. Supabase error strings are mapped to concise localized messages where the failure class is known; unexpected errors use a localized fallback and can be reported through the existing privacy-safe monitoring path.

The hosted email template ships in English for the initial release because Supabase's shared Magic Link template does not receive Walletly's client language as a trusted template selector. Multi-language transactional emails would require a Send Email Hook and are a separate enhancement.

## Error And Security Behavior

- Invalid or incomplete codes never call Supabase.
- Incorrect and expired codes keep the user on the verification step and provide an accessible inline status.
- Rate-limit failures preserve the current countdown and explain when another request can be made.
- A resend invalidates the previous code according to Supabase Auth behavior and clears the current input.
- The interface does not reveal whether an email already has an account.
- Auth requests require network access and show a clear offline message.
- Google OAuth and `/auth/callback` remain available and unchanged.
- Sign-out and restored-session behavior continue through the existing app store.

## Repository Changes

- Extend the Supabase auth adapter with send-code and verify-code operations.
- Expose both operations through the app store without moving authentication policy into the UI.
- Replace magic-link state in the auth screen with the two-step OTP state machine and custom code control.
- Add localized copy for every OTP state.
- Add the local Supabase OTP configuration and branded Magic Link/OTP HTML template.
- Update auth validation, hosted verification tooling, provider setup documentation, migration notes, and release checklist terminology.

## Verification

Focused tests cover email normalization, six-digit validation, send success and failure, countdown persistence, expiry, resend, incorrect code, successful verification, new-account onboarding, and restored sessions. Browser tests exercise the custom code control on mobile and desktop without sending a real email by mocking the Supabase Auth boundary. A separately gated hosted check sends an OTP only when a dedicated test mailbox is configured.

Before completion, run typecheck, lint, unit tests, the relevant Playwright projects, auth configuration validation, PWA validation, production build, and a production-server smoke test. Manual release verification must confirm delivery and code exchange through custom SMTP on localhost, preview, and production before publishing.

## Release Boundary

This task changes local files only. It does not commit, push, publish to Vercel, change the hosted Supabase project, or configure SMTP credentials. The final handoff must list the exact hosted Supabase settings and template content that still need to be applied by an authorized operator.
