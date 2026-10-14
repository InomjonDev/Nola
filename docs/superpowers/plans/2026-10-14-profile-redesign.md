# Profile Redesign Implementation Plan

> **For agentic workers:** Implement inline in this session, task by task. Do not use subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Nola's Profile screen around the account identity, lifetime spendings, current logging streak, note count, and working account destinations.

**Architecture:** Derive the three profile metrics from the already-loaded app-store arrays in a small pure utility module. Update the existing `ProfileView` and its CSS/localization, keeping the current data model and routes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, existing Remix icons, Nola semantic theme tokens.

## Global Constraints

- Preserve the pure-white light theme and OLED-black dark theme through existing semantic tokens.
- Show the current profile avatar when present and initials otherwise; do not add avatar upload.
- Total spendings include visible expenses in the selected profile currency only; do not mix currencies.
- A streak counts consecutive local calendar dates with visible spending, starting today or yesterday.
- Notes count excludes deleted and `undone` captures.
- Keep current name editing, sync status, `/settings`, and `/manage` behavior.
- Hide the floating quick-add action on Profile so it does not cover settings links; retain the bottom navigation.
- Add no database/API changes or dependencies, and do not push to GitHub.
- Run `npm run typecheck` and `npm run lint`; do not add or run test suites unless requested.

---

## Files

- Create `src/lib/profile-metrics.ts` for pure calculations over `Expense[]` and `SpendingCapture[]`.
- Modify `src/components/nola-app.tsx` to replace the current profile composition with the identity hero, metric strip, compact name editor, and real settings links.
- Modify `src/lib/i18n.ts` with the new profile labels and short day-unit strings in English, Russian, and Uzbek.
- Modify `src/app/globals.css` with profile-specific layout, responsive styling, focus/press states, and reduced-motion behavior using current theme tokens.
- Create this plan at `docs/superpowers/plans/2026-10-14-profile-redesign.md`.

## Task 1: Add currency-safe profile metrics

**Files:**
- Create: `src/lib/profile-metrics.ts`
- Reference: `src/lib/types.ts` (`Expense`, `SpendingCapture`)

**Interfaces:**
- `totalSpendingForCurrency(expenses: Expense[], currency: string): number`
- `currentSpendingStreak(expenses: Expense[], now?: Date): number`
- `activeSpendingNoteCount(captures: SpendingCapture[]): number`

- [ ] Implement total as the sum of expenses where `deletedAt` is null and `expense.currency === currency`.
- [ ] Implement the streak by collecting local date keys from visible expenses, ignoring future dates, allowing the most recent active day to be today or yesterday, then counting consecutive days backward.
- [ ] Implement note count as captures where `deletedAt` is null and `parseStatus !== 'undone'`.
- [ ] Keep helpers side-effect-free; accept `now` as an optional date so callers can determine the local streak consistently.

## Task 2: Redesign ProfileView and localize its metrics

**Files:**
- Modify: `src/components/nola-app.tsx` (`ProfileView`, `ProfileStat`, `ProfileInfo`)
- Modify: `src/lib/i18n.ts` (English, Russian, and Uzbek profile dictionaries)
- Modify: `src/app/globals.css` (profile-specific classes)

**Interfaces:**
- `ProfileView` consumes `user`, `profile`, `expenses`, `spendingCaptures`, `isOnline`, and `cloudEnabled` from `useAppStore`.
- `ProfileView` uses the Task 1 helpers and existing `formatMoney`/`languageLocale` utilities.

- [ ] Add translated keys for `Total spendings`, `Streak`, `Notes`, `Edit name`, and the compact day unit in all three locales.
- [ ] Place the localized Profile title above a centered identity block. Render the existing avatar URL with a usable initials fallback; keep the name and email visible.
- [ ] Add three equal metrics beneath the identity. Use the requested money and fire marks as decorative stat symbols and the existing icon family for Notes.
- [ ] Move the name input and save action into a compact, accessible edit control while preserving `store.updateDisplayName(name)` behavior.
- [ ] Group existing member/sync information and only real routes: `/settings` for preferences/privacy and `/manage` for categories/tags.
- [ ] Remove redundant content from the old profile layout without changing shared app-shell navigation.
- [ ] Style the profile for phone and wide-screen layouts with semantic tokens, visible focus, 44px minimum controls, restrained transitions, and `prefers-reduced-motion` handling.

## Task 3: Verify the focused change

**Files:**
- Review: `src/lib/profile-metrics.ts`
- Review: `src/components/nola-app.tsx`
- Review: `src/lib/i18n.ts`
- Review: `src/app/globals.css`

- [ ] Run `npm run typecheck`; fix any type errors caused by the profile work.
- [ ] Run `npm run lint`; fix any lint errors caused by the profile work.
- [ ] Review helper behavior for zero expenses, today, yesterday, a missed day, future-dated entries, deleted expenses, mixed currencies, and pending/deleted/undone notes.
- [ ] Review narrow and wide responsive layout in light and dark modes; confirm the app shell nav remains visible and profile content is not obscured.

## Spec coverage review

- Centered identity with avatar/initials fallback: Task 2.
- Three profile metrics and accurate calculations: Tasks 1 and 2.
- Existing personal editing and account destinations: Task 2.
- White/black theme parity, responsive layout, transitions, accessibility: Task 2 and Task 3.
- No schema/API/dependency/push changes: Global Constraints.
