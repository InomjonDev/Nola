# Walletly Onboarding and Surface Redesign

Date: 2026-10-01
Status: Approved design

## Objective

Refine Walletly into a quieter, more coherent expense-tracking experience by combining the tour and authentication, simplifying home actions and empty states, improving amount entry, removing unnecessary card surfaces and borders, and correctly using provider identity data without weakening account isolation.

## Design Principles

- Use negative space, alignment, and typography to group content instead of surrounding every section with a card.
- Keep interactive targets at least 44 by 44 points.
- Use continuous curves and semantic radii rather than one radius for every element.
- Treat the wallet summary as the primary visual surface; utility content belongs directly on the page background.
- Preserve full functionality in light and dark appearances with at least 4.5:1 contrast for small text.
- Respect Reduce Motion and provide screen-reader labels for icon-only controls, charts, and preview content.

## Combined Tour and Authentication

The signed-out experience is one `/auth` route with four internal stages:

1. Monthly overview tour
2. Fast expense logging tour
3. Private insights tour
4. Consent and authentication

The current separate `/tour` screen is folded into `/auth`. Authentication controls are not mounted during the three tour stages.

The tour includes a quiet Skip action. Skip and completion of the third slide both persist `TOUR_SEEN_KEY` and transition to the authentication stage; neither action starts authentication automatically. The tour is shown once per installation. After it has been completed or skipped, future sign-outs open directly at the authentication stage.

The top-left Walletly badge and the separate Tour link are removed. Tour stages show only progress, Back when applicable, Skip, and Continue. The authentication stage has no promotional top bar.

Spacing contract:

- 24-point horizontal page margins
- 24–28 points between major sections
- 16 points between related internal elements
- 8 points for tightly related labels and controls
- 56-point primary actions
- centered maximum content width on tablet and web

Normal phone layouts remain fixed to one screen. When the keyboard, landscape, or accessibility text sizing reduces available height, the screen may use an overflow fallback so controls never clip.

OAuth and magic-link callbacks remain reachable regardless of the local tour marker. The marker is an onboarding preference, not a security boundary.

## Home

The greeting uses the provider's real display name from `user.name`, not the email prefix. The greeting uses the first given name. The avatar uses the Google provider photo when available and real-name initials as the fallback. The provider image URL remains transient session metadata and is not duplicated in Walletly's database.

Home retains Add, Activity, Insights, and Manage, but presents them as a borderless action rail:

- transparent hit regions
- 44–48 point circular icon wells
- labels below the icons
- 12-point spacing between actions
- only Add uses the accent fill
- opacity and small-scale press feedback, disabled when Reduce Motion is enabled

Recent Activity uses the page background with no card fill, border, or shadow. When empty, it fills the available content area with an icon, concise copy, and an explicit Add expense action. View all is hidden when there are no expenses. Transaction rows remain transparent with subtle separators.

The wallet summary remains the only deliberate card-like visual surface on Home.

## Account Data Isolation

Local persisted app data and offline queues are partitioned by authenticated user ID. Account changes clear the active in-memory dataset before loading the next account's cache and remote data. Home defensively operates only on records owned by the active user, while global categories remain shared.

Demo data uses its own cache namespace. Signing out clears active in-memory data without deleting another account's cache. Provider identity metadata is refreshed with `auth.getUser()` when online without delaying startup.

## Expense Entry

The visible New expense/Add expense title block is removed. The modal begins with a right-aligned close control; the screen purpose remains available to assistive technologies.

The amount remains the visual focus. The amount field stores a canonical unformatted decimal draft while displaying a formatted value. Formatting:

- accepts `.` and `,` decimal input
- accepts pasted currency symbols, regular spaces, and nonbreaking spaces
- inserts locale-appropriate grouping separators while typing
- preserves an incomplete trailing decimal separator such as `12.`
- permits at most 12 integer digits and two fractional digits
- never silently rounds when the currency changes
- validates zero, incomplete, nonnumeric, and overflow values before saving

The currency carousel receives the formatted amount. In dark mode, inactive currency labels use full-strength muted text without additional opacity. The trigger uses a clearly differentiated soft accent treatment and the active currency uses the high-contrast accent text token.

Categories, payment methods, tags, and dates use shared choice-control geometry rather than independent rectangular styles.

## Geometry and Surfaces

Semantic radii:

- card: 12 points
- control: 16 points
- popover: 20 points
- sheet: 28 points
- full: 999 points

Controls and popovers use continuous curves. Noninteractive content sections do not receive borders or contrasting fills merely for grouping.

The date trigger uses a soft fill and 16-point continuous curve. Its calendar popover uses a 20-point curve and retains 44-point month navigation controls.

The analytics chart loses its outer background and border. Spacing groups the total, period control, and chart. Tracks and bars are capsules. Each bar exposes its date/period label and formatted value to assistive technologies.

Category summaries on Insights use the application background and unframed layout. Search fields, category choices, tag choices, and payment choices adopt the shared control radius and avoid one-pixel rectangular outlines.

## Shared Components

- Extend `Chip` with optional leading content, size, and `filter`/`choice` presentation.
- Add pure amount parsing and formatting utilities so UI and persistence do not share string-manipulation logic.
- Add provider avatar support to `UserIdentity` with initials fallback.
- Keep modal sheets elevated; ordinary page sections remain on `colors.background`.

## Error Handling

- Invalid amounts show one inline error beneath the amount field.
- Authentication errors remain inline and do not reset completed consent choices.
- Failed provider-image loading falls back to initials without messaging.
- Failed cache reads fall back to an empty account-scoped dataset and preserve the remote recovery path.
- Sync errors stay visible in Settings and never expose one account's queued operations to another.

## Verification

- Clean install: Tour 1 opens and sign-in controls are absent.
- Skip: persists completion and reveals sign-in without initiating it.
- Complete tour: advances through all three slides and reveals sign-in.
- Restart, logout, and direct `/auth`: completed installations open at sign-in.
- OAuth and email callback routes complete successfully.
- Google real name and provider photo/initials appear on Home and Profile.
- Switching accounts never combines expenses, categories, tags, payment methods, or queued operations.
- Amount sequences, deletion, middle insertion, pasted formats, editing existing expenses, and currency changes remain valid.
- Empty Home, populated Home, expense entry, calendar, and Insights are checked at 375×667 and 430×932 in both themes.
- Currency labels and small text meet contrast requirements.
- Dynamic Type, keyboard-open layout, reduced motion, VoiceOver/TalkBack labels, and 44-point targets are verified.
- TypeScript, lint, Expo Doctor, web export, and native bundle exports pass.

## Scope

This redesign does not add bank sync, OCR, Apple sign-in, income tracking, shared budgets, or new analytics collection. It does not replace the existing wallet summary visual or floating tab bar architecture.
