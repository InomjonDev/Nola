# Nola compact redesign

Date: 2026-10-06
Status: Superseded after implementation review. The user rejected the appearance and requested an entirely flat Apple-inspired direction. See `2026-10-06-nola-flat-apple-design.md`; implementation is paused pending that visual review.

## Intent and decisions

Nola should open onto recent spending. The user finds the current elements too large and the accent colors uncomfortable. Success means a compact, legible transaction list, restrained color, and consistent design across the entire app.

The user approved a restrained forest-green accent, then explicitly required a white light theme and a black dark theme with clear contrast. The earlier suggestion of warm-white or charcoal page backgrounds is superseded by this requirement.

The user subsequently authorized bright colors for icons and small elements, specifying that the app should stay minimal without becoming boring. Forest green remains the action accent; a limited secondary palette brings personality to category/goal glyphs and chart details. This supersedes the earlier restriction to a single color throughout the UI.

The primary user is someone checking their own recent expenses. Expense entry remains readily available. English, Russian, and Uzbek are required throughout the interface. Existing Uzbek uses Latin script; retain it.

Scope includes every current application screen and interaction surface: authentication, onboarding, home, expense entry/editing, activity/history, insights, budgets, savings goals, category/tag management, profile, settings, legal pages, consent/install notices, and loading/error/empty states.

Out of scope: new financial features, changing the database or authentication providers, migrating frameworks, replacing the installed app icon, and publishing or deploying the app.

## Current implementation

The active package is a Next.js 15 / React 19 PWA. `README.md`, route files, and `package.json` agree on this. The old Expo application is in `expo-retired/`; the root AGENTS.md still describes Expo. This redesign targets the active PWA and retains its routing and data behavior.

Theme selection and language selection already exist in `src/theme/theme-provider.tsx` and `src/lib/i18n-provider.tsx`. Translations live in `src/lib/i18n.ts`. Styling currently combines CSS custom properties in `src/app/globals.css`, Tailwind utilities, and a separate palette in `src/theme/index.ts`. The redesign must align these sources and eliminate conflicting visual values.

Current home puts a large summary, chart, and three quick-action boxes before recent transactions. Most screen rendering lives in `src/components/nola-app.tsx`; savings flows live in `src/components/savings-goals.tsx`. Many files already contain uncommitted user work. Preserve those changes and limit edits to the redesign's needs.

## Chosen approach

Use a compact ledger: neutral surfaces, aligned amounts, clear date grouping, short headings, and a modest action accent. Small bright glyphs and chart details add personality. Hierarchy comes from placement, typography, and spacing.

An almost-monochrome version was considered, but the user approved a restrained action accent and subsequently permitted brighter small elements. A warm notebook treatment was considered, but pure white and pure black are now explicit requirements. A large summary dashboard conflicts with the user's recent-spending priority.

## Color and contrast

| Token | Light | Dark |
| --- | --- | --- |
| Page canvas | `#FFFFFF` | `#000000` |
| Supporting surface | `#F5F5F5` | `#121212` |
| Raised neutral control | `#EBEBEB` | `#1F1F1F` |
| Primary text | `#151515` | `#FFFFFF` |
| Secondary text | `#525252` | `#B8B8B8` |
| Accent | `#2F644F` | `#8BBCA2` |
| Text on accent | `#FFFFFF` | `#000000` |
| Input/control border | `#767676` | `#7D7D7D` |
| Destructive text | `#B42332` | `#FCA5A5` |

The page canvas must remain pure white or pure black, including authentication and legal routes. Supporting surfaces are small neutral groupings; they must not cover the entire page. Use neutral separators for transaction groups. Active states have an explicit text weight, underline, checkmark, or shape cue as well as color.

Targets: normal text at least 4.5:1 against its actual background; essential control edges and focus indicators at least 3:1. Compare resolved styles rather than assuming a theme token is sufficient. Do not reduce text contrast using opacity.

Calculated candidate pairs using relative luminance:

| Pair | Light | Dark |
| --- | --- | --- |
| Primary text / canvas | 18.26:1 | 21.00:1 |
| Secondary text / raised surface | 6.55:1 | 8.31:1 |
| Accent text / raised surface | 5.76:1 | 7.70:1 |
| Button text / accent | 6.87:1 | 9.81:1 |
| Control border / raised surface | 3.81:1 | 4.00:1 |

Reserve green for primary actions, selection, links, and progress. Transaction amounts remain neutral. Semantic warning and destructive colors accompany readable labels. Charts use restrained solid fills plus labels; color alone must not identify a category.

### Small bright accents

| Accent family | Light glyph/mark | Dark glyph/mark | Contrast on raised surface, light/dark |
| --- | --- | --- | --- |
| Tangerine | `#BF4F00` | `#FF9947` | 4.06:1 / 7.77:1 |
| Cobalt | `#0969DA` | `#69A7FF` | 4.36:1 / 6.73:1 |
| Teal | `#087F8C` | `#44D3DD` | 3.98:1 / 9.11:1 |
| Rose | `#B72A6B` | `#F777AC` | 4.95:1 / 6.43:1 |

Use these semantic tokens for 18–20px category icons, small goal glyphs, chart bars/legend marks, and occasional tiny status accents. Assign a stable family to each category so it remains recognizable across themes; change its shade for theme contrast. Keep named labels beside these marks and accessible text descriptions for charts. User-defined colors can inform the chosen family, but must not bypass contrast checks.

Apply the palette to glyphs on neutral surfaces. The screen canvas, transaction rows, navigation background, and grouped surfaces remain white/black or neutral gray. Avoid large saturated fills, colored card borders, full-color navigation, glowing marks, and colored icon-box grids. Amounts and ordinary labels use the main text tokens. These accent shades are checked for graphical elements at 3:1; any accent-colored small text must separately meet the stricter 4.5:1 text target.

The contrast criteria follow the [W3C guidance for non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Contrast values above were calculated against the proposed raised surfaces, not claimed as verified in the running app.

Preserve Light, Dark, and System preferences and their persistence. Resolve the stored/system theme before first paint to avoid a white flash in dark mode. Browser/PWA theme colors should follow the actual resolved mode. Existing storage keys remain compatible.

## Typography, density, and shape

- Use the platform system sans-serif stack, with Cyrillic and Latin fallback coverage. Remove explicit Inter styling. Use one type family with regular, medium, and semibold weights.
- Screen titles: 22px / 28px. Section titles: 16px / 22px. Transaction labels and normal body: 15px / 21px. Control labels: 14px / 20px. Supporting metadata: 12–13px / 18px. Summary amounts: 26px / 32px. Expense entry amount: at most 32px initially, with room for large UZS values.
- Use tabular numerals for amounts. Preserve full currency/amount information; wrap when necessary rather than clipping it.
- Spacing scale: 4, 8, 12, 16, 24, 32px. Mobile page gutters: 16px, reducing to 12px at the narrowest supported widths. Related controls use 8–12px gaps; major sections use 24px.
- Buttons and fields are normally 44px high. Icon affordances can look smaller while retaining a 44px interaction area. Never shrink touch targets solely to increase density.
- Transaction rows start at approximately 60px, growing for long text or accessibility settings. Use 8–10px vertical padding, compact secondary information, and clear separators.
- Control corners: 8px. Small grouped surfaces: 10–12px. Sheets: 16px at the upper corners on mobile. Use pills only for genuinely pill-shaped selectors, not every control.
- Avoid oversized logos, circular icon wells, heavy shadows, ornamental headers, and nested cards.

## Navigation and home

Mobile keeps four labeled destinations: Home, Activity, Insights, and Profile. Use a flat, full-width bottom navigation with a top separator, safe-area padding, and small consistent icons. Labels stay visible and fit all three languages. Replace the floating pill navigation and separate oversized circular add button.

Place a compact Add expense action in the app header, reachable in one tap. Desktop uses a narrow, neutral sidebar and the same action. Keep all existing routes and direct links. Management and settings remain reachable from Profile and their existing URLs.

Home order:

1. Compact Nola header and Add expense action; avoid a large greeting/avatar block.
2. Recent spending heading and a plain All activity link.
3. Up to eight recent transactions grouped by date, with category/note on the left and full amount on the right. Tapping a row edits the transaction. Empty accounts get a short empty state and an Add expense action.
4. Small monthly and weekly spending summary as text and amounts, without a hero panel or chart.
5. Compact savings and budget previews beneath the feed on mobile; a secondary column on wide screens.

At 390 × 844, a normal populated home should show at least five ordinary transaction rows before the bottom navigation, without a large summary or quick-action grid pushing the list below the fold. Preserve totals visibility/privacy behavior in the small summary.

Charts belong primarily in Insights. Remove the three quick-action icon boxes from Home. The feed stays the dominant column on desktop.

## Other screens

**Activity/history:** compact title and search, text-led filters that wrap or scroll within their own region, and date-grouped transaction rows. Keep edit/delete and existing filter behavior. Search and filters must not create page-wide overflow.

**Expense entry/editing:** neutral sheet on mobile and a centered dialog on desktop. Simple title, close action, amount, category, payment method, date, tags, note, and save action. Keep existing defaults and validation. Show category names prominently; icons are secondary. Keyboard access, visible focus, Escape/backdrop dismissal, focus containment, focus restoration, and scrolling with the mobile keyboard are required. Backdrop is a solid translucent scrim with no blur. Use concise errors next to the relevant field where practical.

**Insights and budgets:** restrained summary rows, labeled charts with solid fills, compact period controls, and plain progress bars. Budget status uses readable amounts and text. Income and existing budget controls retain their current behavior. Remove decorative banner treatment and repeated stat cards.

**Savings goals:** compact goal rows or small neutral groups, name and saved/target amount, a thin labeled progress indicator, and a clear detail action. Apply the shared sheet and form patterns to creation, deposits, withdrawals, archive/delete confirmation, and history. Completion uses a brief success message; remove decorative confetti.

**Categories and tags:** dense named rows with inline edit/archive controls; neutral text-led selectors with small bright category glyphs. User-defined category names and colors remain stored unchanged, but existing colors must not turn every row into a colored card. Selected items have a clear non-color cue.

**Profile and settings:** compact headers, neutral grouped rows, and short supporting descriptions. Light/Dark/System and English/Русский/O‘zbekcha choices use readable segmented or radio-style controls with explicit selection. Avoid three decorative icon tiles. Preserve reminders, export, sync, sign-out, and account-deletion flows. Destructive actions are clearly labeled and visually distinct.

**Authentication and onboarding:** small Nola wordmark, a short title/description, compact Google and demo actions, and neutral setup controls. Keep the official Google logo. Language and appearance choices must be available before sign-in as well as in Settings. Preserve currency/payment setup and existing consent requirements.

**Legal, consent, installation, loading, and errors:** use the same palette and type scale. Legal titles are modest and articles have a readable measure. Consent/install notices fit narrow viewports and have clear actions. Loading and empty states use short localized text. Existing actionable sync/offline errors remain visible.

## Icons, copy, and interaction

Use one shared Phosphor SVG family, following the explicitly invoked ui-ux-pro-max skill. Navigation and essential actions use regular-weight 18–20px icons; category and goal glyphs use a consistent duotone treatment with a small bright accent. Keep the same treatment within each visual layer. A bright outer glyph must remain legible independently of its softer duotone interior.

Replace the existing widespread Lucide usage through a shared icon adapter and retain compatibility with stored category/goal icon identifiers. Category and goal pickers remain text-led. Keep third-party brand logos intact. The [official Phosphor React documentation](https://github.com/phosphor-icons/react) supports the active PWA stack, regular/duotone weights, and importing only required icons. Add `@phosphor-icons/react` during implementation; avoid importing the entire catalog. Remove the Lucide dependency only after confirming no active app imports remain.

Visible labels explain actions. Icon-only controls have translated accessible names. Avoid generic filler and large eyebrow labels above headings. Use ordinary punctuation and no decorative emoji headings. User-entered notes are not rewritten.

Use immediate state changes and short functional transitions for sheets or selection. Respect reduced motion. No scroll reveals, cursor effects, or hover opacity fading. Hover changes a neutral background or underline; disabled state remains distinguishable.

## Localization

Audit all visible UI strings, accessible names, validation, dates, and financial formatting for English, Russian, and Uzbek. Translate new copy in all three dictionaries. Preserve user-entered names and notes. Replace built-in English defaults with localized display labels while preserving stored identifiers/data.

Use existing locale mapping (`en-US`, `ru-RU`, `uz-Latn-UZ`) and number/date formatting utilities. Test Cyrillic text, Uzbek apostrophes, longer labels, large UZS amounts, and long category/note text. Headings, buttons, and filters may grow/wrap; no fixed-height text clipping. Preference choices persist and update the document language.

## Implementation boundaries

- Keep routes in `src/app/` and data/business logic in `src/lib/` unchanged unless a narrow display adaptation is necessary.
- Share visual primitives, icons, and transaction-row styling outside route files. Extract only the components required to apply the redesign consistently; avoid unrelated restructuring.
- Align the CSS palette, shared theme tokens, and any color-dependent components. Remove hard-coded white button text where dark-mode accent buttons require black text.
- Preserve existing account data, storage keys, auth callbacks, exports, offline queueing, savings calculations, and deletion confirmations.
- Update the older Luna design reference to clearly mark this approved direction as superseding its purple, Inter, large-hero, and pill-control recommendations.

## Prohibited design patterns

The implementation must honor all nineteen exclusions from the user's request:

1. No purple-to-blue gradient.
2. No gradient hero text.
3. No emojis in headings.
4. No pervasive Inter font.
5. No colored border cards.
6. No glassmorphism cards.
7. No low-contrast dark mode.
8. No three icon boxes in a row.
9. No badge above headlines.
10. No Lucide icons everywhere.
11. No untouched shadcn UI.
12. No fade-in on scroll.
13. No cursor-following beam.
14. No buttons fading on hover.
15. No inconsistent spacing.
16. No excessive em dashes.
17. No generic buzzword copy.
18. No Space Grotesk + Instrument Serif font pairing.
19. No grain over a gradient.

For this implementation, decorative gradients, glass blur, and grain are unnecessary and should be absent altogether.

## Validation and acceptance

Run `npm run lint` and `npm run typecheck`, then the applicable existing interaction tests and a production build. Use the project's current scripts rather than Expo commands against the Next.js package.

Update the responsive test expectations for a pure-black dark canvas and the revised home heading. Check every main route and the expense/goal sheets at 320, 390, 768, and 1280px in both themes. Exercise every screen in English, Russian, and Uzbek; capture the home, activity, expense sheet, and settings at 390px for all six theme/language combinations, plus representative desktop screenshots.

Verify:

- Pure-white and pure-black page canvases across routes.
- Text/control contrast against actual backgrounds, including primary buttons and selected states.
- Recent spending appears immediately and meets the ordinary-row density target.
- No horizontal page overflow, hidden amounts, overlapping navigation, or clipped translations.
- Theme/language persistence and theme resolution on reload and system-mode change.
- Expense create/edit/delete, filtering, budget display, savings contributions, export, and existing offline behavior still work.
- Dialog keyboard/focus behavior, mobile touch targets, and reduced-motion behavior.
- All nineteen prohibited patterns are absent.
- Bright category/goal icons and chart details add personality without turning surfaces into saturated panels; graphical contrast is verified independently in both themes.
- Test a 375px phone, landscape orientation, reduced motion, and 200% text scaling in addition to the main responsive matrix.

The current change is a design document only. App lint/typecheck and visual verification will be run after implementation; no redesigned UI has been claimed as tested yet.

## ui-ux-pro-max research

Applied the skill's required design-system generation, style search, UX validation search (`animation accessibility z-index loading`), and stack guidance for the verified Next.js app. Adopted its consistent vector icons, theme-based contrast, touch-target sizing, spacing rhythm, safe-area handling, stable interaction states, loading feedback, and reduced-motion principles.

Generated style suggestions are supporting material, not requirements. Discard recommendations for Inter, oversized editorial type, marketing/app-store landing layouts, dark-only support, glows, or avoiding white backgrounds because they conflict with this app and the user's explicit decisions. Retain the established system font, recent-spending-first layout, and pure-white/pure-black themes.
