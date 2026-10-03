# Walletly Expo to Next.js PWA Migration Note

## Retained

- Supabase migrations and RLS tests in `supabase/`.
- Domain types, constants, mappers, currency parsing, formatting, localization dictionaries, and offline queue semantics in `src/lib/`.
- Local-first expense mutations with sync recovery.
- Google OAuth and cross-browser passwordless email links through Supabase Auth.

## Rebuilt for Web

- The active app surface now uses Next.js App Router under `src/app/`.
- React Native screens and components were not blindly copied. The PWA uses web-native responsive components in `src/components/`.
- Theme and language providers now use browser storage and CSS semantic tokens.
- Notifications use browser permission checks, service worker notification clicks, and documented backend scheduling requirements.
- PWA assets live under `public/`.

## Retired Expo Files

The previous Expo source, `app.json`, and `eas.json` were copied to `expo-retired/` before the web migration. They remain available until the Next.js PWA has been verified and accepted.

## Verification Checklist

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run pwa:validate`
- `npm run build`
- Production smoke test with `npm start`
- Manual checks at 375px, tablet, and desktop
- Light/dark theme, offline mode, auth callback, add/edit/delete, filters, export, account deletion, and installability
