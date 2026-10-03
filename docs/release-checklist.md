# Walletly release checklist

Use this checklist for every preview and production candidate. The commands are intentionally split between local validation and account/device validation.

## Automated checks

- [ ] `npm ci`
- [ ] `npm run doctor`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test -- --runInBand`
- [ ] `npm run test:rls` with a disposable Supabase test project
- [ ] `npm run auth:validate` and `npm run auth:verify` on localhost, preview, and production
- [ ] `npm run e2e` on mobile and desktop Chromium
- [ ] `npm run pwa:validate` and `npm run seo:validate`
- [ ] `npm audit --omit=dev --audit-level=high` reviewed; no known production vulnerabilities
- [ ] `npx expo export --platform ios`
- [ ] `npx expo export --platform android`
- [ ] `npm audit --omit=dev --audit-level=high` reviewed; no forced dependency downgrade

## Auth and data checks

- [ ] Google OAuth works on localhost, preview, and production, including cancellation and restored sessions
- [ ] Email links sign in an existing user and confirm a new user on localhost, preview, and production
- [ ] Email links expire after 1800 seconds, are single-use, support resend, work in another browser or device, and restore the authenticated session
- [ ] Email-link requests report offline, rate-limit, unauthorized-mailbox, and delivery failures without exposing raw provider errors
- [ ] Branded Confirm signup and Magic Link messages are delivered through Resend custom SMTP, contain the 30-minute expiry, and use the `/auth/confirm` token-hash route
- [ ] Auth limits are 30 emails per hour, 60 seconds between accepted email requests, and 30 sign-in/signup and verification requests per five minutes per IP
- [ ] Apple Sign In is absent from the release build and store metadata
- [ ] User A cannot read or mutate User B data in the RLS integration test
- [ ] Account deletion removes cloud rows, signs out sessions, clears local records, and cancels reminders
- [ ] Offline create/edit/delete recovers after reconnect, app termination, duplicate mutations, and failed sync
- [ ] Income entries and monthly budgets sync offline and remain isolated by RLS

## Notifications and privacy

- [ ] Daily reminder permission denial leaves the app usable
- [ ] A reminder is not scheduled for a day with a logged expense
- [ ] Android channel exists and notification tap opens Add Expense
- [ ] Notification tap works after a cold start
- [ ] Error reporting endpoint is configured, redacts numbers/emails, and contains no notes or tokens
- [ ] Web Push subscription registers only after user action; expired subscriptions are removed by the reminder function
- [ ] Privacy, terms, cookies, deletion contact, store privacy forms, and support URLs use real release details

## Device matrix

- [ ] iPhone 375pt light and dark mode
- [ ] Web tablet viewport light and dark mode
- [ ] Web desktop viewport light and dark mode
- [ ] Large iPhone light and dark mode
- [ ] Compact Android light and dark mode
- [ ] Large Android light and dark mode
- [ ] VoiceOver and TalkBack labels, selected states, Dynamic Type, reduced motion, keyboard, and 44pt touch targets
- [ ] Airplane mode, reconnect, app backgrounding, and app termination during sync

## Build and store

- [ ] EAS project is linked to the app and `EXPO_TOKEN` is configured in CI
- [ ] Preview build installed on at least one iOS and Android physical device
- [ ] Production build installs and launches from a clean install
- [ ] iOS App Privacy and Google Play Data Safety declarations match the third-party audit
- [ ] Version/build numbers are incremented and release channel is correct
