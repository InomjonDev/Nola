# Production readiness

Walletly's active production target is the Next.js PWA. The Expo implementation remains in `expo-retired/` as a migration reference and is not part of the web deployment.

## Verified locally

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run pwa:validate
npm run seo:validate
npm run build
```

The hosted RLS integration test is skipped unless a dedicated test Supabase project is configured. Never point it at production data.

## Required before release

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. This is used for canonical URLs, Open Graph images, `robots.txt`, and `sitemap.xml`.
2. Set the Supabase URL and publishable key in Vercel. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Add localhost, Vercel preview, and production `/auth/callback` URLs in Supabase Auth URL Configuration.
4. Configure the Google OAuth provider with the Supabase callback URL and verify the consent screen's production branding.
5. Apply and review the migrations in `supabase/migrations/`, then run the RLS policy checks against a dedicated test project.
6. Deploy the optional `daily-reminders` Edge Function only if closed-app scheduled reminders are required; browser timers are not a reliable substitute.
7. Submit the production sitemap to Google Search Console and Bing Webmaster Tools after the custom domain is live.

## Security expectations

The web app sends `nosniff`, strict-origin referrer, frame-denial, and permissions-policy headers. HTTPS, the platform's TLS configuration, Supabase RLS, and secret management still belong to the hosting and Supabase projects.

The app does not claim that local JavaScript timers can notify users while the PWA is closed. Reliable closed-app reminders require Web Push subscription storage, a sender, and a scheduled backend job.
