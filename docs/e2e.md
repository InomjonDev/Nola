# Walletly E2E Tests

Install the browser once with `npx playwright install chromium`, then run `npm run e2e`. The suite starts a separate Next.js server on port 3100, uses local demo mode for deterministic data workflows, and runs both iPhone-sized and desktop Chromium projects.

The auth callback test validates provider-error handling without using a real OAuth account. Hosted Google and magic-link verification must be run manually with a dedicated test Supabase project because both providers require external accounts and email delivery. The hosted RLS suite is `npm run test:rls` and requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for that test project.
