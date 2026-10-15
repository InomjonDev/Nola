# Production readiness

Nola is the Next.js/PWA application deployed at `https://nolapp.vercel.app`.

## Verified for the current release candidate

- Vercel production project `nola` is linked to `InomjonDev/nola`; `NEXT_PUBLIC_SITE_URL` and the auth callback origin use `https://nolapp.vercel.app`.
- Local parsing uses the server-only `GEMINI_API_KEY` with `gemini-3.1-flash-lite` by default. The production Vercel secret must be configured and verified separately before AI parsing is available there.
- Gemini free-tier requests may be used to improve Google products and processed by human reviewers. Do not send sensitive or personal spending notes through the free tier.
- Supabase migrations are applied through `20261015072927_production_integrity_indexes`.
- AI parsing has bounded JSON input, authenticated requests, per-user and per-network quotas, and a 20-request-per-minute Vercel Firewall rule for `/api/spending-captures/parse`.
- Production response headers include HTTPS HSTS, clickjacking protection, MIME sniffing protection, a referrer policy, permissions restrictions, and CSP.
- Daily push reminders are explicitly disabled until the sender, secrets, and schedule have been deployed and verified.

## Release checks

Run before every release:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:goals:db
npm run auth:validate
npm run auth:verify
npm run pwa:validate
npm run seo:validate
npm audit --omit=dev --audit-level=high
npm run build
npm run e2e
```

Run hosted RLS tests only against a disposable Supabase project, never production data. Verify sign-in and deletion with dedicated test accounts; do not use a real user's account for release checks.

## Hosted configuration still requiring owner verification

- Supabase Auth Site URL, production and preview redirect URLs, Google OAuth credentials, branded email templates, SMTP sender, and hosted request limits must be read back in the Supabase dashboard. The dashboard was not authenticated in this release pass, so these settings are not claimed as verified.
- The Supabase Security Advisor reports leaked-password protection disabled. Supabase documents this control as Pro-plan-only; Nola currently uses passwordless links and Google sign-in, but the hosted provider configuration still needs owner review.
- No error-reporting collector is configured. Client reports remain disabled; use Vercel runtime and deployment logs for server-side operational review until a privacy-safe collector is configured.
- The Privacy Policy identifies the Nola project owner by the provided support email, but a legal operator name was not provided. The owner should add the legal name if required for their jurisdiction or business structure.
- The production privacy, terms, sign-in, deletion, and install flows still need a clean-profile end-to-end check after deployment.

## Security expectations

Vercel Firewall adds a path-specific, per-IP fixed-window limit to the database quotas. Supabase's quota function is intentionally `SECURITY DEFINER` and is scoped to `auth.uid()` with a pinned search path; account deletion uses the same pattern to remove only the caller's data. The `spending_parse_attempts` table intentionally has RLS enabled with no client policies, so browser roles cannot inspect its abuse-control ledger.

The current deployment is suitable for a controlled personal-use launch after the hosted Auth configuration is verified. Do not treat it as fully production-ready for broad public use until the outstanding hosted Auth and operational checks above are completed.

The Tailwind CSS 4 build targets modern browsers: Safari 16.4+, Chrome 111+, and Firefox 128+. Older browser support would require a different CSS build.
