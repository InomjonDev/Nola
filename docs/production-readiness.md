# Production readiness

Walletly's active production target is the Next.js PWA. The Expo implementation remains in `expo-retired/` as a migration reference and is not part of the web deployment.

## Verified locally

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run e2e
npm run pwa:validate
npm run seo:validate
npm audit --omit=dev
npm run build
```

`npm run auth:validate` and `npm run auth:verify` cover the local environment and OAuth callback contract. The hosted RLS integration test is skipped unless a dedicated test Supabase project and service-role key are configured. Never point it at production data.

## Required before release

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. This is used for canonical URLs, Open Graph images, `robots.txt`, and `sitemap.xml`. The Walletly Vercel production values are configured locally through the Vercel CLI, but no deployment was triggered.
2. Set the Supabase URL and publishable key in Vercel. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Add localhost, Vercel preview, and production `/auth/callback` and `/auth/confirm` URLs in Supabase Auth URL Configuration.
4. Configure the Google OAuth provider with the Supabase callback URL and verify the consent screen's production branding.
5. Apply both branded token-hash email templates from `supabase/templates/`, set email-link expiry to 1800 seconds, and configure Resend SMTP with a verified Walletly sender domain. Apply the hosted Auth rate limits documented in `docs/supabase-provider-setup.md`.
6. Apply and review all migrations in `supabase/migrations/`, then run the RLS policy checks against a dedicated test project. The local CLI is not installed in this workspace, so remote migration execution remains a manual Supabase step.
7. Deploy `daily-reminders`, set its VAPID/cron secrets, and create the Vault-backed `pg_cron` schedule when closed-app scheduled reminders are required; browser timers are not a reliable substitute.
8. Configure `NEXT_PUBLIC_ERROR_REPORTING_URL` with a privacy-safe collector and verify redaction.
9. Submit the production sitemap to Google Search Console and Bing Webmaster Tools after the custom domain is live.

## Security expectations

The web app sends `nosniff`, strict-origin referrer, frame-denial, and permissions-policy headers. HTTPS, the platform's TLS configuration, Supabase RLS, and secret management still belong to the hosting and Supabase projects.

The app does not claim that local JavaScript timers can notify users while the PWA is closed. Reliable closed-app reminders require Web Push subscription storage, a sender, and a scheduled backend job.
