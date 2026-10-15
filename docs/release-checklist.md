# Nola PWA release checklist

Use this checklist for each web preview and production candidate.

## Automated checks

- [ ] `npm ci`
- [ ] `npm run auth:validate`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:rls` with a disposable Supabase project
- [ ] `npm run auth:validate` and `npm run auth:verify` on localhost, preview, and production
- [ ] `npm run e2e` on mobile and desktop Chromium
- [ ] `npm run pwa:validate` and `npm run seo:validate`
- [ ] `npm audit --omit=dev --audit-level=high` reviewed
- [ ] `npm run build` and verify the production server starts

## Authentication and data

- [ ] Google OAuth works on localhost, preview, and production, including cancellation and restored sessions
- [ ] Email links sign in existing users and confirm new users on each release origin
- [ ] Email links expire after 1800 seconds, are single-use, can be resent, and work in another browser or device
- [ ] Sign-in and verification rate limits are configured in the hosted auth project
- [ ] User A cannot read or mutate User B's records in the hosted RLS integration test
- [ ] Account deletion removes cloud records, clears local records, and cancels reminders
- [ ] Offline create, edit, and delete recover after reconnect, reload, duplicate mutations, and failed sync
- [ ] New database migrations are reviewed, applied, and backed up before deployment

## Privacy, accessibility, and notifications

- [ ] Analytics is inactive until the user grants consent and excludes raw financial details
- [ ] Error reporting is configured with redaction and retention controls
- [ ] Privacy, terms, cookie, deletion, and support details match the release operator and actual data flows
- [ ] Keyboard navigation, focus handling, screen-reader labels, contrast, zoom, and reduced motion are checked
- [ ] Responsive layouts are checked at phone, tablet, and desktop widths in light and dark themes
- [ ] Reminder permission denial leaves the app usable
- [ ] Web Push registration follows a user action; delivery and cold-start click behavior are verified if reminders ship
- [ ] Closed-app reminders are disabled unless the push sender, function secrets, subscription storage, and schedule are deployed

## Deployment and PWA

- [ ] `NEXT_PUBLIC_SITE_URL` is the final HTTPS origin
- [ ] Supabase callback and confirmation URLs match localhost, preview, and production origins
- [ ] Production secrets are configured server-side; service-role and provider keys are never exposed through `NEXT_PUBLIC_`
- [ ] The parser has both per-user/database quotas and a Vercel Firewall IP rate limit
- [ ] Required migrations and edge functions are deployed to the intended Supabase project
- [ ] Production install, offline shell, update behavior, and account sign-in are verified in a clean browser profile
- [ ] Manifest, icons, service worker, canonical URLs, sitemap, and robots policy use the production origin
- [ ] Error monitoring and an operational support channel are confirmed
