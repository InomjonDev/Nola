# Walletly

Walletly is now a responsive Next.js PWA for private, local-first expense tracking. It keeps Supabase Auth/Postgres/RLS as the backend, preserves the Walletly domain model, and replaces the Expo UI with web-native responsive screens.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run typecheck
npm run lint
npm test
npm run pwa:validate
npm run seo:validate
npm run build
npm start
```

## PWA Installation

On Chrome or Edge, use the browser install button or Walletly's install prompt. On iOS Safari, use Share -> Add to Home Screen. The manifest, app shell, icons, screenshots, and service worker live in `public/`.

## Supabase

Copy the Supabase publishable key into `.env.local`. Add these Supabase Auth redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://YOUR_DOMAIN/auth/callback`

Run the migrations in `supabase/migrations/` before testing cloud sync. The Expo implementation is preserved in `expo-retired/` until the PWA is fully verified.

## SEO and production URL

Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin users will visit in production, for example `https://walletly.example.com`. Walletly generates canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml` from that value. The public entry and legal pages are indexable; authenticated workspace routes and the OAuth callback are intentionally noindex.

## Documentation

- Deployment: `docs/next-pwa-deployment.md`
- Migration note: `docs/migration-note-next-pwa.md`
- Provider setup: `docs/supabase-provider-setup.md`

## Current Limitations

Browser notifications can show from the service worker and route clicks to `/add-expense`, but reliable reminders while the PWA is closed require backend Web Push scheduling. The starter Supabase Edge Function is in `supabase/functions/daily-reminders/`.
# walletly
