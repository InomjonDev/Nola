# Walletly Supabase Provider Setup

Project ref: `fudtkdiqzkroouiawldd`

## 1. App configuration

```bash
cp .env.example .env.local
```

Copy the publishable key from the Supabase Connect dialog into `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://fudtkdiqzkroouiawldd.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Do not use a `service_role` key in the Expo app.

## 2. Redirect URLs

In Supabase Dashboard, open **Authentication → URL Configuration** and add:

- `walletly://auth/callback`
- `http://localhost:8081/auth/callback`
- The exact Expo Go callback printed by `makeRedirectUri` during Expo Go testing

## 3. Google OAuth

1. Open Google Cloud Console → Google Auth Platform → Clients.
2. Create a **Web application** OAuth client.
3. Add the Supabase callback shown in the Google provider page. For this project it is:
   `https://fudtkdiqzkroouiawldd.supabase.co/auth/v1/callback`
4. In Supabase Dashboard, open **Authentication → Sign In / Providers → Google**.
5. Enable Google and paste the Google client ID and client secret.
6. Keep the Google scopes limited to `openid`, profile, and email.

## 4. Email magic link

Keep Supabase's email provider enabled. Walletly uses `signInWithOtp` with a redirect to `auth/callback`; no external email vendor is required for development. Supabase's default email service has usage limits, so add a custom SMTP provider only when production volume requires it.

## 5. Database

Run `supabase/migrations/202610010001_expense_tracker_mvp.sql` in the project SQL Editor. It creates the Walletly tables, ownership policies, indexes, and the account deletion function.

After running it, verify that RLS is enabled for `profiles`, `payment_methods`, `categories`, `tags`, and `expenses`.

## 6. Test

```bash
npm start
```

On the auth screen, accept the terms and age confirmation, then test Google and the email magic link. Complete onboarding and create one expense to verify the authenticated row sync. Walletly also includes a local demo mode and does not require paid Apple services.
