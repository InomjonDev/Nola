# Nola Compact Redesign Implementation Plan

> **For agentic workers:** Execute tasks inline in this session, with validation checkpoints. The user's approval authorizes implementation without another execution-choice gate.

**Status:** Superseded by `2026-10-06-nola-flat-apple.md` after the user rejected the first visual pass.

**Goal:** Redesign all active Nola screens around recent spending, pure-white/pure-black themes, compact readable controls, colorful small icons, and complete English/Russian/Uzbek UI.

**Architecture:** Keep the Next.js PWA's routes and finance store. Centralize visual tokens and icon rendering, share localized category/payment labels and dialog behavior, then apply the new layout to existing views.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 3, Phosphor SVG icons, Playwright.

## Global Constraints

- Page canvas: `#FFFFFF` in light mode, `#000000` in dark mode.
- Recent spending leads Home; show at least five ordinary rows at 390 × 844.
- Normal text contrast at least 4.5:1; essential graphical controls at least 3:1.
- Controls retain 44px interaction areas; body text is 15px; screen headings are 22px.
- Preserve existing routes, financial data, local storage keys, offline/auth/export behavior, and all pre-existing uncommitted work.
- Honor all nineteen exclusions in the approved specification.
- English, Russian, and Uzbek Latin script throughout.

## Task 1: Shared theme, icons, and display labels

**Files:** `src/theme/index.ts`, `src/theme/theme-provider.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `tailwind.config.ts`, `src/components/icons.tsx`, `src/components/category-icon.tsx`, `src/lib/i18n.ts`, `package.json`, `package-lock.json`.

**Interfaces:** Preserve `useLedgerTheme()` and `CategoryIcon()`; export existing action icon names from a Phosphor adapter so all consumers share one family. Add localized display-label helpers keyed by existing stored category/payment names.

- [ ] Install `@phosphor-icons/react` in the active Next.js package. Replace active Lucide imports; remove Lucide after the import audit.
- [ ] Replace both palettes and CSS tokens with approved values. Add `on-accent`, control-edge, and category accent tokens. Example:

```css
:root { --color-bg: 255 255 255; --color-accent: 47 100 79; --color-on-accent: 255 255 255; }
:root[data-theme="dark"] { --color-bg: 0 0 0; --color-accent: 139 188 162; --color-on-accent: 0 0 0; }
```

- [ ] Use a pre-paint preference script and guarded storage reads to resolve the theme without white flashes. Synchronize browser theme-color on preference change.
- [ ] Replace Inter, large pills, blurred scrims, and oversized form styling with the approved type/spacing/control scale. Remove decorative confetti styling.
- [ ] Validate with `npm run typecheck` and inspect imports with `rg 'lucide|cardGradient|backdrop-blur|Inter' src`.

## Task 2: Home, navigation, and transaction interaction

**Files:** `src/components/nola-app.tsx`, `src/components/use-dialog-focus.ts`, `src/app/globals.css`, `src/lib/i18n.ts`.

**Interfaces:** Preserve `NolaApp({ view, overlay })`, `ExpenseList({ expenses, onEdit })`, and the current store actions. `useDialogFocus(ref, onClose)` owns focus trapping, Escape dismissal, scroll locking, and restoration.

- [ ] Replace the floating pill nav with four labeled links; use a compact header Add expense button and desktop sidebar.
- [ ] Render eight recent transactions first, grouped by local calendar date, followed by small monthly/weekly summaries and goal/budget previews.
- [ ] Make each transaction's main action open editing, preserve a separate delete action, and allow full amounts/long labels to wrap. Example grouping key:

```ts
const key = new Date(expense.spentAt).toDateString();
```

- [ ] Add neutral selected states and translated empty states. Keep actual category names/notes searchable alongside localized display names.
- [ ] Apply reusable dialog focus behavior to expense editing and deletion confirmation without removing current savings sheet safeguards.

## Task 3: Remaining screen parity and localization

**Files:** `src/components/nola-app.tsx`, `src/components/savings-goals.tsx`, `src/components/legal-page.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/lib/i18n.ts`, `docs/nola-luna-design-reference.md`.

- [ ] Use compact headers without eyebrow badges; update profile, history, insights, management, auth, onboarding, and settings.
- [ ] Keep charts in Insights, replace hard-coded chart colors with theme tokens, localize weekday/week labels, and expose values in chart accessible descriptions.
- [ ] Style savings rows/sheets consistently, retain their behavior, and replace decorative completion confetti with the existing localized success state.
- [ ] Add appearance/language preferences to authentication and onboarding; translate all new labels in all three dictionaries.
- [ ] Retain official Google branding. Reduce legal title sizing and remove buzzword footer copy. Add accessible names to category selectors and controls.
- [ ] Mark the older Luna reference as superseded by the approved compact design.

## Task 4: Validation and visual review

**Files:** `tests/e2e/design-responsive.spec.ts`, `tests/e2e/design-localization.spec.ts`, and existing lifecycle tests as needed for changed headings/selectors only.

- [ ] Update pure-black expectations and assert the Home hierarchy, date grouping, navigation labels, and five-row visibility. Check at 320/375/390/768/1280px plus phone landscape.
- [ ] Exercise both themes and all three languages; capture Home, History, Settings, expense sheets, and goal sheets. Assert no horizontal overflow, unobscured amounts, and contrast for rendered text/control colors.
- [ ] Verify persisted theme/language on reload, reduced motion, text scaling, and expense dialog keyboard/focus behavior.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and applicable Playwright interaction tests. Preserve and report any unrelated pre-existing failures separately.
- [ ] Inspect actual phone and desktop screenshots, fix material layout issues, then update the spec status and plan checkboxes.

## Plan review

The tasks cover every approved screen, palette, localization, icon, interaction, and acceptance requirement. Implementation stays in the current working tree to preserve the user's active app changes. Do not stage or commit unrelated existing modifications.
