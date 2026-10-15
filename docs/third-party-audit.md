# Nola PWA third-party inventory

This inventory covers dependencies and external services used by the active Next.js PWA. Review provider settings and terms again before production release.

| Dependency or service | Purpose | Data involved | Release handling |
| --- | --- | --- | --- |
| Supabase Auth and Postgres | Sign-in and cloud sync | Account identity and user-owned financial records | Required for signed-in sync; owner access is enforced with RLS |
| Google Gemini API | Optional spending-note parsing | User-provided note text and parsing context, only after AI parsing is enabled | Keep the key server-side and disclose that free-tier prompts and responses may be used to improve Google products and reviewed by humans; do not send sensitive or personal information on the free tier |
| PostHog | Optional product analytics | Coarse workflow events and booleans | Disabled until analytics consent; do not send amounts, notes, names, tags, or payment details |
| Error-reporting collector | Optional sanitized application errors | Redacted message, name, short stack, surface, and release | Configure access control, rate limits, retention, and alerting |
| Noto Sans | Local font files | None | Bundled with the app; license notice is in `public/fonts/OFL.txt` |
| Remixicon | UI icons | None | Bundled JavaScript and CSS; no icon service calls |
| jsPDF | Client-side PDF export | Current export data processed in the browser | No document upload is performed by the library |
| Browser APIs | Local storage, service worker, install prompt, notifications, file downloads | Device-local app data and user-approved reminder settings | Request permissions only when needed; isolate private API/auth responses from shared caches |

## Data minimization

- Analytics excludes raw financial values, note text, category names, tag names, payment method names, and export contents.
- AI parsing is opt-in and sends the selected spending note to the configured parsing provider. Do not claim that note text stays local when parsing is enabled.
- Daily reminder delivery is disabled in the current release. If re-enabled after backend verification, reminder copy stays generic and excludes amounts, categories, notes, and balances.
- The app does not include advertising, location, contacts, camera, or bank-linking SDKs.
- Cloud record access is protected by owner-scoped RLS policies; account deletion uses an authenticated database function and clears the current browser's local session and data.
