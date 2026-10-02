# Walletly third-party audit

Reviewed for the MVP redesign on 2026-10-01.

| Dependency | Purpose | Data sent | Permissions / storage | Decision |
| --- | --- | --- | --- | --- |
| Supabase JS | Auth and cloud persistence | Account identity and user-owned app records required for sync | Secure session storage; RLS policies in Postgres | Required for signed-in sync |
| PostHog capture endpoint | Product funnel measurement | Coarse workflow events and booleans only | Optional on web until cookie consent; no notes, amounts, names, tags, or exports | Keep, privacy-limited |
| Expo Notifications | Daily local reminder | No expense data; notification copy is generic | Notification permission only after the user enables reminders | Optional, user-controlled |
| Expo SecureStore | Session and demo-session persistence | Session token or local demo marker | Device secure storage | Required for auth persistence |
| AsyncStorage | Web offline app data and preferences; small native preferences | Browser-local records on web, theme, consent, reminder preference, notification IDs | Browser/device-local storage | Required for offline-first MVP; native financial records use SecureStore chunks |
| Expo SecureStore | Native offline account records and auth session | Encrypted device-local account records, session token, demo marker | iOS Keychain / Android Keystore-backed storage | Required for native financial-data protection |
| NetInfo | Reconnect detection | No user data | Network state only | Required for sync queue |
| Lucide React Native | Category and navigation icons | None | No network or storage | Keep; ISC-licensed |
| Expo LinearGradient | Wallet balance card treatment | None | No network or storage | Keep; no external asset |
| Gesture Handler / Reanimated / Worklets | Native-feeling currency gesture | None | No network or storage | Keep; interaction only |

## Data minimization decisions

- Analytics does not receive raw financial values, note text, category names, tag names, payment method names, or exported JSON.
- The reminder is generic and does not expose an amount, category, note, or account balance in notification text.
- No advertising SDK, location SDK, contacts access, camera access, receipt OCR, or bank-linking SDK is included.
- Cloud access is protected by owner-scoped RLS policies. Account deletion calls the authenticated database deletion function and clears the local session.
- The app uses the platform system font stack and no remote images, so there is no separate font or image license to track for the product UI.
