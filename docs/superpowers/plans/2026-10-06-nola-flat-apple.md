# Nola Flat Apple-Inspired Implementation Plan

> **For agentic workers:** Execute inline, with visual and interaction checkpoints. The user approved the paired concept and requested another icon pack.

**Goal:** Match the approved flat Home concept throughout the app, with Remix Icon, white/black themes, and English/Russian/Uzbek support.

**Architecture:** Retain the Next.js PWA and finance store. Update shared CSS/theme tokens, the icon adapter, spending rows, preference rows, and opaque editor surfaces. Preserve storage keys and existing tested financial behavior.

**Tech Stack:** Next.js 15, React 19, Tailwind 3, TypeScript, Remix Icon, Playwright.

## Global constraints

- No shadows, glass, blur, gradients, lifted cards, moving selection pills, or dimmed floating sheets.
- White light canvas and black dark canvas; body text at least 4.5:1 and meaningful glyphs at least 3:1.
- Compact toolbar title 17px, content heading 22px, transaction description 17px, secondary text 13px.
- Plain recent spending first; complete right-aligned amounts; flat filled category/navigation glyphs.
- Keep comfortable 44px hit areas, responsive text, focus handling, reduced motion, and all nineteen exclusions.
- Preserve pre-existing working-tree changes and all three languages.

## Task 1: Palette, icon family, and flat primitives

**Files:** `src/theme/index.ts`, `src/app/globals.css`, `src/components/icons.tsx`, `src/components/category-icon.tsx`, `src/components/display-preferences.tsx`, `tailwind.config.ts`, `package.json`, `package-lock.json`.

- [x] Install `@remixicon/react`, map the existing icon API to Remix symbols, and remove Phosphor after an import audit.
- [x] Make all surfaces share the canvas; use action blue and small adaptive orange/green glyph accents.
- [x] Remove shadow/blur/animation styles and convert navigation/selection to flat color, text, and checkmark cues.
- [x] Replace raised preference segments with named rows; use compact native selectors in auth/onboarding.

```css
.mobile-nav-link[aria-current="page"] { color: rgb(var(--color-accent)); background: transparent; }
.expense-sheet-backdrop { background: rgb(var(--color-bg)); }
.expense-sheet { border: 0; border-radius: 0; box-shadow: none; }
```

## Task 2: Home, spending rows, and editing

**Files:** `src/components/nola-app.tsx`, `src/components/savings-goals.tsx`, `src/components/use-dialog-focus.ts`, `src/lib/i18n.ts`.

- [x] Use a centered Nola toolbar title and borderless Add action, with flat filled tab icons.
- [x] Make expense description primary and category secondary; remove persistent trash icons from rows.
- [x] Put expense deletion in its editor, preserving the current store action and accessible keyboard behavior.
- [x] Show month/week summaries as ordinary text rows without hero totals or cards.
- [x] Present expense/goal editing as opaque full-screen phone views with clear close/save actions; on wider screens use a full-canvas editing pane.

```tsx
<span className="expense-name">{expense.note.trim() || categoryName}</span>
<span className="expense-detail">{categoryName}</span>
```

## Task 3: Screen parity and verification

**Files:** `src/components/legal-page.tsx`, error/auth pages, `tests/e2e/design-localization.spec.ts`, `tests/e2e/design-responsive.spec.ts`, `tests/e2e/expense-lifecycle.spec.ts`, `tests/e2e/savings-goals.spec.ts`, `docs/nola-luna-design-reference.md`.

- [x] Apply the same flat rows and controls to insights, savings, settings, profile, management, authentication, and legal pages.
- [x] Update interaction tests to delete through the editor and dismiss opaque editors with their close controls or Escape.
- [x] Verify screenshots against the approved concept, not only measured layout/contrast.
- [x] Run lint, typecheck, unit tests, a production build, and the relevant responsive/localization/lifecycle/offline tests.
- [x] Confirm pure canvases, no depth effects, full UZS amounts, theme/language persistence, text scaling, and keyboard focus.

## Review

All approved visual constraints and existing financial flows are covered. This plan supersedes the earlier compact-ledger plan; no new financial features or framework changes are required.

## Verification record

Lint and typecheck passed. Unit tests: 59 passed, with the existing hosted RLS integration test skipped because its dedicated credentials are not configured. All 23 relevant browser test cases passed across the visual/localization, responsive, expense, savings, auth, export/delete, offline, and PWA runs. PWA/SEO validation passed. Actual phone and desktop screenshots were reviewed and the PWA images refreshed. The optimized production build passed (19 static pages generated).
