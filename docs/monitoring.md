# Walletly Monitoring

Walletly reports uncaught App Router errors through `src/lib/error-reporting.ts`. The payload is intentionally limited to a sanitized message, error name, short stack, surface, platform, and app version. It never sends expense amounts, notes, tags, categories, payment methods, exports, or user email addresses.

## Configure a collector

Set `NEXT_PUBLIC_ERROR_REPORTING_URL` to an HTTPS collector that accepts JSON `POST` requests. The collector should apply rate limiting, retention limits, access control, and alerting. The app remains usable when the endpoint is absent or unavailable.

For Sentry, use a small ingestion endpoint or relay rather than placing a Sentry auth token in the browser. Keep `NEXT_PUBLIC_APP_VERSION` aligned with the deployed release and configure the collector to group by `surface`, `name`, and release.

## Verify locally

1. Set a local collector URL that records request bodies without exposing them in terminal output.
2. Trigger an App Router error in a test environment.
3. Confirm the request contains only the sanitized fields described above.
4. Confirm the app recovery button resets the boundary and that the app works with the variable removed.
