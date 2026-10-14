# Home Spending Reference Layout Implementation Plan

> **For agentic workers:** Execute inline in this checkout. Work through each task and keep the existing local changes intact.

**Goal:** Adapt the home spending area to the reference hierarchy with a monthly category summary and compact daily note rows.

**Architecture:** Add a focused category summary component that derives month-to-date totals from existing expense and category data. Integrate it into the unfiltered home workspace above the existing capture list, and refine capture-list grouping and card presentation without changing storage or navigation.

**Tech Stack:** Next.js 15, React 19, TypeScript, existing Tailwind utilities and `src/app/globals.css`, existing i18n and format helpers.

## Global Constraints

- Use the app's existing white/light and black/dark surfaces; do not use the reference's pink color.
- Use solid existing category colors and existing locale/currency formatters.
- Keep the current full-screen note open behavior, search, folders, category filters, and parser states.
- Keep the summary limited to active expenses in the profile currency; do not convert currencies.
- Do not change the database, parser, or note lifecycle.
- Do not push or commit implementation changes.
- Do not add or run tests; run the repository-required lint and typecheck checks.

## File Map

- Create `src/components/spending/monthly-category-summary.tsx` for current-month category aggregation and rows.
- Modify `src/components/nola-app.tsx` to show the summary only on the unfiltered home view.
- Modify `src/components/spending/capture-list.tsx` to group capture rows by capture calendar date/month while preserving existing filtering.
- Modify `src/components/spending/capture-card.tsx` to keep each note row concise and accessible.
- Modify `src/app/globals.css` for the reference-inspired category rows, proportional bars, month headings, and responsive note row layout.
- Modify `src/lib/i18n.ts` for the category section label if no existing suitable translation is available.

### Task 1: Add the current-month category summary

**Files:**
- Create: `src/components/spending/monthly-category-summary.tsx`
- Modify: `src/components/nola-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/i18n.ts` only if an existing translated category heading cannot be reused

**Interfaces:**
- The component receives `expenses: Expense[]`, `categories: Category[]`, and `currency: string`.
- It omits deleted or out-of-month expenses and categories with zero spend.
- It renders each category's label, solid icon badge, formatted amount, and a share bar computed from the sum of same-currency expenses.

- [x] Add the focused summary component using `CategoryIcon`, `categoryLabel`, `formatMoney`, and `languageLocale`.
- [x] Place it between `HomeSummary` and `CaptureList` only when `mode === 'home'`, the search query is empty, and there are no folder or category filters.
- [x] Add styles for a simple section heading and category rows with a thin neutral track and category-colored proportional fill; keep overflow safe on mobile.

### Task 2: Present daily notes as a compact spending timeline

**Files:**
- Modify: `src/components/spending/capture-list.tsx`
- Modify: `src/components/spending/capture-card.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Preserve `CaptureList` props and existing search/folder/category/tag filtering.
- Keep each capture's active linked expense count, distinct category badges, and currency-specific total.
- Keep standalone expense rows unchanged.

- [x] Group visible capture rows by the capture's local calendar date and month, with small muted date/month labels and no Today/Yesterday headings.
- [x] Keep capture rows as full-width buttons that show up to four overlapping category badges, a `+N` badge for additional categories, an expense count, and right-aligned totals.
- [x] Preserve processing, retry, sign-in, folder, tags, accessible labels, and full-screen note opening.
- [x] Add responsive spacing and separators so the list reads as a compact timeline under the category summary.

### Task 3: Validate the UI changes

**Files:**
- No additional files.

- [x] Run `npm run typecheck` and confirm exit code 0.
- [x] Run `npm run lint` and confirm exit code 0.
- [x] Run `git diff --check` and inspect the final changed-file list; confirm no push or implementation commit was made.

## Self-Review

- The category summary covers current-month, profile-currency spend and is only visible on the unfiltered home view.
- Capture rows remain dated by capture day, not by any backdated transaction inside the note.
- Search and filtered views retain their existing row behavior, while standalone expenses keep their existing renderer.
- Light and dark surfaces, category colors, and note open behavior remain in the existing design system.
