# Nola

Nola is a responsive Next.js PWA for private, local-first expense tracking. It uses Supabase Auth, Postgres, and row-level security for cloud sync, with web-native responsive screens.

The Nola rebrand retains existing browser storage and hosted integration identifiers to preserve compatibility with saved data. Daily push reminders stay disabled until a sender and schedule are configured.

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

On Chrome or Edge, use the browser install button or Nola's install prompt. On iOS Safari, use Share -> Add to Home Screen. The manifest, app shell, icons, screenshots, and service worker live in `public/`.

## Supabase

Copy the Supabase publishable key into `.env.local`. Add these Supabase Auth redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://nolapp.vercel.app/auth/callback`

Apply the migrations in `supabase/migrations/` to the Supabase project before enabling cloud sync.

## SEO and production URL

Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin users will visit in production, for example `https://nola.example.com`. Nola generates canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml` from that value. The public entry and legal pages are indexable; authenticated workspace routes and the OAuth callback are intentionally noindex.

## Documentation

- Deployment: `docs/next-pwa-deployment.md`
- Architecture: `docs/pwa-architecture.md`
- Provider setup: `docs/supabase-provider-setup.md`

## Current Limitations

Daily reminders are disabled in the current release because production push delivery is not configured. Settings explains this and lets an existing subscription be removed. The sender implementation is in `supabase/functions/daily-reminders/`.
# Nola
