# Walletly History, Icons, Theme, and Localization Design

## Goal

Improve the daily expense workflow with gesture-first deletion, user-selected category icons, a calm theme transition, and English, Russian, and Uzbek Latin language support.

## Scope

### Swipe-to-delete history rows

History rows remain full-width and editable with a tap. A right-to-left pan moves the row on the UI thread and reveals a destructive action surface behind it. Releasing past the commit threshold deletes the expense through the existing store and sync queue. Releasing before the threshold springs the row back. The visible trash icon in each row and the delete confirmation modal are removed. A brief undo affordance restores the deleted expense locally and queues the latest upsert when available.

The gesture uses a spring for settling, velocity-aware commit behavior, rubber-band resistance at the left boundary, and reduced-motion handling. No React state updates occur in the per-frame gesture handler.

### Manual category icon selection

Categories gain an optional persisted `icon` identifier. The existing Lucide category registry remains the rendering source. Missing or unknown identifiers fall back to the current name-based icon mapping so existing local/cloud data remains valid. Global categories retain their defaults. Custom category creation and editing expose a compact selectable icon grid with accessible labels.

The icon identifier is included in local persistence, Supabase row mapping, export output, and category sync payloads. No user-entered financial details are added to analytics.

### Theme transition

The theme provider keeps the current screen mounted while the semantic palette updates. A full-screen overlay using the previous background color fades to transparent over 260ms, making the palette change read as one composed transition. Manual theme changes and system appearance changes share this behavior. Reduced motion uses an immediate background handoff without opacity or movement animation.

### Localization

The app adds a small typed translation dictionary for `en`, `ru`, and Uzbek Latin (`uz`). New installs inspect the device locale, choose Russian or Uzbek when matched, and fall back to English for all other locales. A user-selected language stored in AsyncStorage overrides device detection. Settings exposes English, Русский, and O‘zbekcha.

Current MVP user-facing strings are routed through the dictionary, including auth, onboarding, dashboard, history, filters, category management, settings, legal navigation labels, empty states, delete/undo feedback, and accessibility labels where practical. Expense notes, category names, tags, and payment-method labels remain user data and are not translated.

## Data contracts

- `Category.icon?: CategoryIconName` is optional for backward compatibility.
- Category mapping reads and writes `icon` while preserving unknown values through the fallback renderer.
- `ThemeProvider` exposes the existing mode API plus a transition-safe resolved palette.
- `I18nProvider` exposes `language`, `setLanguage`, and `t(key, params?)`.

## Testing

- History swipe: below-threshold snap-back, threshold deletion, velocity deletion, undo restore, and no visible default delete button.
- Categories: icon selection, custom icon persistence, global icon defaults, and missing-icon fallback.
- Theme: manual light/dark/system changes, persisted mode, and reduced-motion behavior.
- Language: locale detection, persisted override, all three selectors, and representative translated screens.
- Existing typecheck, lint, and unit tests remain passing.

## Non-goals

- No new bank or receipt integrations.
- No translation of user-created data.
- No replacement of the existing Supabase auth or sync architecture.
