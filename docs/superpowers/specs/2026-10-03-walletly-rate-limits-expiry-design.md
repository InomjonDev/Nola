# Walletly Rate Limits and Email-Link Expiry Design

**Status:** Approved for local implementation on 2026-10-03.

## Goal

Move Walletly email authentication from Supabase's restricted demonstration mailer to a documented Resend custom-SMTP configuration, make every email sign-in link expire after 30 minutes, and protect network, destructive, and expensive actions from duplicate or abusive bursts without slowing offline expense entry.

## Root Cause

Supabase's built-in mailer is project-wide, best-effort infrastructure limited to two messages per hour and restricted to authorized project-team addresses. A recipient can therefore receive a rate-limit or authorization error on their first personal request after other project messages have consumed the shared allowance. Walletly must not describe every HTTP 429 as though that recipient already requested another link.

Production delivery uses Resend custom SMTP. Supabase remains the authority that generates, expires, verifies, and invalidates single-use token hashes. Resend only transports the message.

## Hosted Email Configuration

The hosted Supabase project will be configured manually after local verification with:

- SMTP host `smtp.resend.com`.
- SMTP port `465` with SSL.
- SMTP username `resend`.
- SMTP password supplied from a server-only Resend API key.
- Sender name `Walletly`.
- A sender address on a verified production domain.
- Auth email project limit of 30 messages per hour initially.
- Magic-link minimum interval of 60 seconds per recipient.
- Sign-in/signup limit of 30 requests per five minutes per IP.
- Token-verification limit of 30 requests per five minutes per IP.

The API key, SMTP password, and Supabase management token are never stored in a browser variable, committed file, screenshot, log, or test fixture. Local development continues to use the local Supabase mail catcher when available; repository configuration and documentation describe hosted Resend values without embedding credentials.

## Email-Link Lifetime

Supabase Auth `otp_expiry` is set to `1800` seconds. This is the authoritative expiration and applies to the token hash whether the browser tab remains open, the URL is copied, or the user changes devices. The app does not implement a second client-only expiry check that could disagree with Supabase.

Both Confirm Signup and Magic Link templates state that the link expires in 30 minutes and can be used once. The signed-out inbox state uses the same wording. Invalid, consumed, malformed, and expired links share a safe recovery state that directs the user to request a new link.

## Layered Rate Limits

### Server-Enforced Authentication Limits

Supabase Auth remains authoritative for email delivery, sign-in/signup, verification, and token refresh limits. The local `supabase/config.toml` mirrors the intended rates with `auth.rate_limit` values where supported and keeps `auth.email.max_frequency = "1m"`.

### Browser Cooldowns

Walletly adds a privacy-preserving device cooldown for email requests. It stores only a next-allowed timestamp under `walletly.auth.magicLinkNextAllowedAt`; it never stores the requested email address. The cooldown starts only after Supabase accepts a request. It lasts 60 seconds, survives refreshes, disables resend and new email submissions, and displays a localized countdown.

If Supabase returns `over_email_send_rate_limit`, Walletly says email sending is temporarily limited and does not imply that the recipient already requested a link. If it returns `over_request_rate_limit`, Walletly identifies a network/request throttle. Offline, unauthorized-address, and general delivery errors remain distinct. Raw provider messages are not displayed.

### Other Action Boundaries

- Google OAuth remains single-flight while its request is active.
- Export generation is limited to five starts per rolling minute per browser to prevent repeated large serializations and downloads.
- Account deletion is single-flight and disables its action while running; failed attempts may be retried after the current request settles.
- Cloud synchronization keeps one active flush, processes at most 25 queued operations per pass, spaces remote mutations by 100 milliseconds, and retains the existing bounded exponential retry behavior.
- Expense, income, budget, category, tag, and payment-method edits remain immediate local mutations. They are not client-throttled because Walletly is offline-first; only their remote sync boundary is paced.

Browser cooldowns improve UX and suppress accidental duplicates but are not treated as security controls. Server-side Supabase limits, RLS, and authentication remain authoritative.

## Components

- `src/lib/action-rate-limit.ts` contains pure rolling-window and timestamp helpers with no React or storage dependency.
- `src/components/walletly-app.tsx` owns email countdown presentation, export throttling, and destructive-action busy states.
- `src/lib/supabase.ts` continues to expose one request method and one token-hash verification method.
- `src/lib/offline-sync.ts` owns bounded and paced remote queue processing.
- `supabase/config.toml`, templates, validation scripts, and deployment documents define the 30-minute and rate-limit policy.

## Testing

Unit tests cover rolling-window decisions, retry-after rounding, malformed persisted timestamps, and boundary times. Browser tests cover first successful request, refresh-persistent cooldown, disabled resend with countdown, cooldown expiry, accurate Supabase error-code messages, 30-minute copy, expired-link recovery, export throttling, and duplicate account-deletion prevention. Existing lifecycle, offline sync, localization, PWA, and OAuth tests must continue to pass on 375px mobile, 768px tablet, and desktop.

The final local gate runs install, typecheck, lint, unit tests, auth/PWA/SEO validation, the full Playwright suite, production build, dependency audit, and production-server smoke checks. Real Resend delivery remains a hosted manual check requiring a verified sender domain and API key.

## Release Boundary

This implementation changes local files only. It does not commit, push, deploy, configure Resend, mutate hosted Supabase settings, or expose credentials. The handoff identifies the exact Dashboard values and credentials still required.

## References

- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase Auth error codes: https://supabase.com/docs/guides/auth/debugging/error-codes
- Supabase local configuration reference: https://supabase.com/docs/guides/local-development/cli/config
- Resend SMTP settings: https://resend.com/changelog/smtp-service
