# Walletly Next.js PWA Deployment

## Local Development

Run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Auth Redirects

Add these redirect URLs in Supabase Auth URL Configuration:

- `http://localhost:3000/auth/callback`
- `https://YOUR_VERCEL_DOMAIN/auth/callback`
- Any custom production domain callback, for example `https://walletly.example.com/auth/callback`

Google OAuth should use the Supabase callback URL shown in the Supabase provider settings. Walletly uses the browser PKCE flow.

## Production Build

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run pwa:validate
npm run seo:validate
npm run build
npm start
```

## Vercel

1. Import the repository into Vercel.
2. Set the environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before building so canonical links, social previews, `robots.txt`, and `sitemap.xml` use the production domain.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it with `NEXT_PUBLIC_`.
5. Deploy with the included `vercel.json`.

## PWA Installation

Chrome and Edge show an install button in the address bar or Walletly's install prompt after the service worker and manifest are available. On iOS Safari, open Share and choose Add to Home Screen. The app shell, static routes, icons, and last fetched pages are cached for offline startup.

## Notifications

Walletly requests notification permission only from the Settings reminder action. The service worker handles notification clicks and opens `/add-expense`.

Closed-app scheduled reminders require backend delivery. The included `supabase/functions/daily-reminders` function is the smallest cron-ready design: deploy it, add storage for Push API subscriptions, connect a Web Push sender, and schedule it from Supabase cron at the desired reminder time.
