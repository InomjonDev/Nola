# Walletly Supabase Provider Setup

Project ref: `fudtkdiqzkroouiawldd`

## 1. App Configuration

```bash
cp .env.example .env.local
```

Set the browser-safe project URL and publishable key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fudtkdiqzkroouiawldd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
```

Never use a secret key or `service_role` key in a `NEXT_PUBLIC_` variable.

## 2. Redirect URLs

In Supabase Dashboard, open **Authentication > URL Configuration**. Set the production Site URL and allow these exact application redirects:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/confirm`
- The Vercel preview origin followed by `/auth/callback`
- The Vercel preview origin followed by `/auth/confirm`
- The final production origin followed by `/auth/callback`
- The final production origin followed by `/auth/confirm`

Google OAuth uses `/auth/callback`. Email confirmation and sign-in links use `/auth/confirm`; do not point email links at the OAuth callback.

## 3. Google OAuth

1. Create a Web application client in Google Auth Platform.
2. Add `https://fudtkdiqzkroouiawldd.supabase.co/auth/v1/callback` as its authorized redirect URI.
3. In **Authentication > Sign In / Providers > Google**, enable Google and enter the client ID and secret.
4. Keep scopes limited to OpenID, profile, and email.

## 4. Passwordless Email Links

In **Authentication > Sign In / Providers > Email**:

1. Keep the Email provider and new-user signups enabled.
2. Set the email-link expiry to `1800` seconds. Supabase is authoritative for the 30-minute lifetime.
3. Keep the minimum interval between email requests at `60` seconds.

In **Authentication > Rate Limits**, begin with these release values:

- Email messages: `30` per hour. Raise this only after monitoring real delivery volume and abuse.
- Sign-in and signup requests: `30` per five minutes per IP address.
- Token verifications: `30` per five minutes per IP address.
- Token refresh requests: `150` per five minutes per IP address.

In **Authentication > Email Templates**:

1. Set **Confirm signup** to subject `Confirm your Walletly account` and use the complete contents of `supabase/templates/confirmation.html`.
2. Set **Magic Link** to subject `Your Walletly sign-in link` and use the complete contents of `supabase/templates/magic_link.html`.
3. Confirm both templates contain `{{ .RedirectTo }}` and `{{ .TokenHash }}` and do not contain `{{ .Token }}`.
4. Confirm the primary button target is `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.

New email addresses receive the Confirm signup template; returning addresses receive the Magic Link template. Both routes exchange the one-time token hash at `/auth/confirm`, so the message can be opened on another browser or device without relying on the requester browser's PKCE verifier.

For production, configure **Authentication > SMTP Settings** with Resend and a verified Walletly sender domain:

- Host: `smtp.resend.com`
- Port: `465`
- Encryption: SSL/TLS
- Username: `resend`
- Password: a server-only Resend API key
- Sender name: `Walletly`
- Sender address: an address on the verified domain, such as `hello@walletly.example`

The Resend API key belongs only in Supabase's hosted SMTP settings. Do not add it to `.env.local`, Vercel browser variables, Git, screenshots, or test fixtures. Supabase's default SMTP is a project-wide development mailer with a very small shared allowance and is not suitable for production delivery. A first request for one address can fail after unrelated project emails consume that shared limit. New Free projects using default SMTP also cannot customize Auth templates, so custom SMTP is required for the branded email on those projects.

Local Supabase uses the matching values and both HTML templates in `supabase/config.toml`. Restart the local Supabase stack after changing Auth config.

## 5. Database

Apply every migration in `supabase/migrations/` in filename order. Confirm RLS remains enabled and run the hosted RLS test with a disposable test project and server-only service-role credential.

## 6. Verification

Validate local files and public environment variables:

```bash
npm run auth:validate
```

Verify Google OAuth and request a real link for a dedicated mailbox:

```bash
AUTH_VERIFY_ORIGIN=http://localhost:3000 \
AUTH_TEST_EMAIL=walletly-auth-test@example.com \
npm run auth:verify
```

Open the received link and confirm it reaches the matching origin's `/auth/confirm` route, removes the token from browser history, creates a session, and enters onboarding or the dashboard. Repeat against preview and production. The script never prints the mailbox, publishable key, token, or resulting session. Complete a first-time link sign-in, onboarding, and one synced expense manually before release.

Also verify that the request button enters a 60-second browser cooldown only after Supabase accepts the request, the cooldown survives a reload without storing the email address, and the same link is rejected after 30 minutes. Hosted Dashboard settings must be applied manually; repository configuration does not change the hosted project.
