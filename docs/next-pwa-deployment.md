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
- `http://localhost:3000/auth/confirm`
- `https://YOUR_VERCEL_DOMAIN/auth/callback`
- `https://YOUR_VERCEL_DOMAIN/auth/confirm`
- Any custom production domain callback, for example `https://walletly.example.com/auth/callback`
- The matching custom-domain email confirmation URL, for example `https://walletly.example.com/auth/confirm`

Google OAuth uses `/auth/callback` with the browser PKCE flow. Passwordless email uses `/auth/confirm` to exchange a one-time token hash in the browser that opens the link.

## Supabase Email Links

Walletly uses link-only passwordless email authentication with a server-enforced `1800` second expiry. In **Authentication > Email Templates**, replace **Confirm signup** with `supabase/templates/confirmation.html` and **Magic Link** with `supabase/templates/magic_link.html`. Both templates must link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`; neither should contain `{{ .Token }}`. This token-hash exchange allows the link to open on a different browser or device from the one that requested it.

Configure Resend custom SMTP with a verified sender domain before production: host `smtp.resend.com`, port `465` with SSL/TLS, username `resend`, and a server-only Resend API key as the password. Start Supabase's hosted email limit at 30 per hour, keep the 60-second recipient interval, and use 30 per five minutes per IP for sign-in/signup and token verification. The default Supabase SMTP service is for limited development use and does not provide production delivery guarantees. Run the real-mailbox request and click-through described in `docs/supabase-provider-setup.md` on localhost, preview, and production.

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

The production implementation uses these Supabase Edge Function secrets: `WALLETLY_CRON_SECRET`, `WALLETLY_VAPID_PUBLIC_KEY`, `WALLETLY_VAPID_PRIVATE_KEY`, and `WALLETLY_VAPID_SUBJECT`. Set the public VAPID key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in the web environment. Generate a VAPID key pair with `npx web-push generate-vapid-keys --json`, then store the private key only in Supabase Function Secrets. Deploy the new migrations and `daily-reminders` function, then schedule an invocation every minute with `pg_cron` and `pg_net`, storing the function URL, publishable key, and cron secret in Supabase Vault. The request must include `x-walletly-cron-secret`; do not put the service role key in the browser or in a committed SQL file. The function uses `reminder_preferences.last_notified_on` as a per-user, timezone-local daily claim, so repeated cron invocations do not send duplicate reminders; users with an expense logged for their local day are skipped.

Reminder delivery stays off until a signed-in user enables it from Settings, grants browser permission, and the VAPID public key is configured. If the Edge Function, VAPID secrets, or cron schedule are not deployed, the UI reports that reminders are unavailable rather than pretending a browser timer can run with the app closed.

Example Vault-backed schedule:

```sql
select cron.schedule('walletly-daily-reminders', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'walletly_project_url') || '/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'walletly_publishable_key'),
      'x-walletly-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'walletly_cron_secret')
    ),
    body := jsonb_build_object('scheduled_at', now())
  )
$$);
```
