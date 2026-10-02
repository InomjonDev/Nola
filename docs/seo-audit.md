# Walletly SEO audit

## Implemented

- Canonical URL, title, description, Open Graph, Twitter card, app metadata, and finance category metadata.
- `SoftwareApplication` JSON-LD on the public entry route.
- Generated `robots.txt` and `sitemap.xml` with the configured `NEXT_PUBLIC_SITE_URL` origin.
- Public entry and legal pages are indexable; account, workspace, onboarding, add-expense, and OAuth callback routes are noindex.
- Authenticated/private paths are excluded from the sitemap and disallowed in `robots.txt`.
- Public screenshot assets are available for social previews and PWA install metadata.
- Security headers are applied to all application responses.

## Production verification

Run `npm run seo:validate` for static checks. After deployment, verify the live origin in a browser and submit `/sitemap.xml` to Search Console. The production URL must be set before the build; otherwise local development intentionally falls back to `http://localhost:3000`.

## Scope limitation

Walletly is an authenticated finance application rather than a content site. Indexing private dashboards would expose low-value app shells and create privacy/crawl noise, so SEO work is focused on the public entry and legal surfaces. English is the crawlable default; the in-app Russian and Uzbek translations do not currently have separate locale URLs or `hreflang` alternates.
