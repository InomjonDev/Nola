# Profile Redesign Design

## Goal

Redesign Nola's Profile page around the supplied mobile reference: a clear identity area, three useful spending metrics, and compact links to existing account settings. Preserve Nola's current navigation, data model, translations, and pure-white light theme / OLED-black dark theme.

## Product direction

Use a profile-led layout. On phones, center the account identity and place the metrics directly beneath it. Keep the content column comfortably bounded on wider screens. The global bottom navigation remains owned by the app shell.

The identity area shows the user's existing avatar when available and otherwise a generated initials avatar. Display name and email remain visible. Keep the current name-edit capability, but present it as a compact personal-information control rather than a large form dominating the page. Do not offer avatar editing because the app has no avatar-upload flow.

## Profile metrics

Show three equal, readable metrics with consistent icon treatment:

1. **Total Spendings** — sum visible, non-deleted expenses matching the profile's selected currency, formatted in the active locale. Do not add amounts from different currencies because Nola has no exchange-rate conversion.
2. **Streak** — consecutive local calendar dates with at least one visible expense, counting back from today or yesterday. A gap beyond yesterday yields zero.
3. **Notes** — count non-deleted spending captures whose parse status is not `undone`.

Use the requested money and fire emoji as small decorative metric marks, not navigation controls. Use a consistent vector icon for Notes. Include localized labels and streak wording in English, Russian, and Uzbek.

## Account and settings content

Keep actions connected to existing features. Use a small number of grouped rows for personal details, general preferences/privacy (`/settings`), and categories/tags (`/manage`). Keep membership and cloud/offline sync information available in the account group. Do not add visual rows for unsupported notification or help destinations, and do not invent avatar upload, notification, or support features on this page.

## Visual and interaction details

- Use existing semantic color tokens so the current white light theme and black dark theme remain correct.
- Use Nola's existing Remix icon family for controls and destination rows.
- Keep the profile title and identity hierarchy compact; avoid landing-page hero effects, fake testimonials, carousels, or marquee content.
- Use restrained 150–250 ms opacity/position transitions for entry and press feedback. Respect `prefers-reduced-motion`.
- Keep interactive targets at least 44 px high and icon-only controls labeled for assistive technology.
- Preserve keyboard navigation and visible focus styles.

## Data flow and boundaries

All metrics derive from the already-loaded app store (`expenses`, `spendingCaptures`, `profile`, and `user`). The page remains local-first and requires no database migration, API call, new dependency, or data-model change. Existing sign-in, name update, settings, and manage routes remain the sources of truth for those operations.

## Validation

- Verify totals with multiple currencies present; only the selected profile currency contributes.
- Verify streaks for activity today, yesterday, a missed day, and no expenses.
- Verify note count excludes deleted and undone captures while including pending/failed active notes.
- Verify avatar URL and initials fallback, name saving, and settings links.
- Run `npm run typecheck` and `npm run lint`.
- Review the layout at narrow mobile and desktop widths, in light and dark themes, with reduced motion enabled.

## Scope exclusions

No avatar upload, new settings pages, account data changes, navigation redesign, external image assets, extra animation library, or push to GitHub.
