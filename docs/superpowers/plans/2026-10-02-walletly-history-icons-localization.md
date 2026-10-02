# Walletly History, Icons, Theme, and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-to-delete history rows, manual Lucide category icon selection, animated theme changes, and English/Russian/Uzbek Latin localization to the existing Expo MVP.

**Architecture:** Preserve the existing local-first `AppStoreProvider`, Supabase mappers, and semantic theme tokens. Add a typed `I18nProvider` at the root, extend categories with an optional icon identifier, and isolate gesture motion inside `ExpenseRow` using Reanimated shared values. Use a short background overlay transition in `LedgerThemeProvider` so the current route remains mounted while palette colors update.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, `react-native-gesture-handler`, Reanimated 4, AsyncStorage, Lucide React Native, TypeScript, Node test runner.

## Global Constraints

- Uzbek uses Latin script (`O‘zbekcha`).
- New installs select Russian or Uzbek from the device locale and fall back to English; a Settings choice overrides detection.
- Existing category records without an icon remain valid and use the existing name-based fallback.
- Swipe motion stays on the UI thread; no React state updates occur from `onUpdate`.
- Theme transition uses a 260ms overlay fade and respects reduced motion.
- User-created notes, names, tags, and payment-method labels are never translated.
- Existing typecheck, lint, and unit tests must remain passing.

---

### Task 1: Add language contracts and translation provider

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/lib/i18n-provider.tsx`
- Modify: `src/lib/types.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/(tabs)/settings.tsx`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- `Language = "en" | "ru" | "uz"` in `src/lib/types.ts`.
- `createTranslator(language): (key: TranslationKey) => string` in `src/lib/i18n.ts`.
- `I18nProvider` exposes `useI18n(): { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string }`.

- [ ] **Step 1: Write failing dictionary and locale tests**

```ts
test("detects supported device languages and falls back to English", () => {
  assert.equal(detectLanguage("ru-RU"), "ru");
  assert.equal(detectLanguage("uz-UZ"), "uz");
  assert.equal(detectLanguage("en-US"), "en");
});

test("returns translated labels and falls back to English for a missing key", () => {
  assert.equal(createTranslator("uz")("history.title"), "Tarix");
  assert.equal(createTranslator("ru")("history.title"), "История");
  assert.equal(createTranslator("en")("unknown.key" as never), "unknown.key");
});
```

- [ ] **Step 2: Run the focused tests and verify they fail because the provider is missing**

Run: `node --experimental-strip-types --test tests/i18n.test.ts`

Expected: FAIL with missing `src/lib/i18n.ts` exports.

- [ ] **Step 3: Implement the typed dictionaries and provider**

Add the supported language union, locale detection using `Intl.NumberFormat().resolvedOptions().locale`, a complete dictionary for current MVP labels, AsyncStorage persistence, and a safe English key fallback. Wrap `Navigator` with `I18nProvider` inside `RootLayout`.

- [ ] **Step 4: Add the Settings language selector**

Render three accessible choices labeled `English`, `Русский`, and `O‘zbekcha`; call `setLanguage` on selection and keep the selected option visually emphasized.

- [ ] **Step 5: Route current user-facing MVP strings through `t`**

Update auth, onboarding, dashboard, analytics, history, manage, profile, settings, add-expense, empty-state, consent, and legal navigation labels. Keep user-created values untouched.

- [ ] **Step 6: Run focused and full checks**

Run: `node --experimental-strip-types --test tests/i18n.test.ts` and `npm run typecheck`.

Expected: all i18n tests pass and TypeScript reports no errors.

- [ ] **Step 7: Commit the localization slice**

```bash
git add src/lib/i18n.ts src/lib/i18n-provider.tsx src/lib/types.ts src/app/_layout.tsx src/app/'(tabs)'/settings.tsx src/app/auth.tsx src/app/onboarding.tsx src/app/add-expense.tsx src/app/'(tabs)' tests/i18n.test.ts
git commit -m "feat: add Walletly language preferences"
```

### Task 2: Persist and edit category icons

**Files:**
- Create: `src/components/category-icon-picker.tsx`
- Create: `supabase/migrations/202610020002_category_icons.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/app/(tabs)/manage.tsx`
- Modify: `src/components/category-icon.tsx`
- Test: `tests/category-icons.test.ts`

**Interfaces:**
- `CategoryIconName` is a finite Lucide registry key.
- `Category.icon?: CategoryIconName` remains optional for legacy records.
- `CategoryIconPicker({ value, onChange, color })` renders accessible icon choices.
- `addCategory(name, icon?)` and `renameCategory(id, name, icon?)` preserve existing callers through optional parameters.

- [ ] **Step 1: Write failing icon fallback and mapper tests**

```ts
test("unknown and missing icons fall back to the category name", () => {
  assert.equal(resolveCategoryIcon("Food", undefined), "utensils");
  assert.equal(resolveCategoryIcon("Custom", "not-a-real-icon" as never), "tag");
});

test("category rows round-trip the optional icon", () => {
  const item = { ...GLOBAL_CATEGORIES[0], icon: "utensils" as const };
  assert.equal(toCategory(categoryRow(item)).icon, "utensils");
});
```

- [ ] **Step 2: Implement the registry, optional type, mapper, and database column**

Add the optional `icon` field, defaults for the five global categories, `icon` mapping in both directions, fallback resolution, and a migration with `alter table public.categories add column if not exists icon text` plus a non-empty length check.

- [ ] **Step 3: Extend store category mutations**

Accept optional icons in create and rename operations, queue the updated mapped record, and provide the current icon when editing.

- [ ] **Step 4: Build the icon picker and integrate Manage**

Add a compact Lucide grid to custom category creation and edit mode. Global categories remain read-only. Use accessible labels and a selected state; do not add a separate icon package.

- [ ] **Step 5: Update all category rendering to use the stored icon**

Pass `category.icon` into expense rows, dashboard, analytics, and add-expense category chips while retaining the name fallback.

- [ ] **Step 6: Run tests and commit**

Run: `node --experimental-strip-types --test tests/category-icons.test.ts`, `npm run typecheck`, and `npm run lint`.

```bash
git add src/components/category-icon.tsx src/components/category-icon-picker.tsx src/lib/constants.ts src/lib/types.ts src/lib/mappers.ts src/lib/app-store.tsx src/app/'(tabs)'/manage.tsx src/app/'(tabs)'/history.tsx src/app/'(tabs)'/index.tsx src/app/'(tabs)'/analytics.tsx src/app/add-expense.tsx supabase/migrations/202610020002_category_icons.sql tests/category-icons.test.ts
git commit -m "feat: add custom category icons"
```

### Task 3: Replace history delete controls with swipe-to-delete

**Files:**
- Modify: `src/components/expense-row.tsx`
- Modify: `src/app/(tabs)/history.tsx`
- Modify: `src/lib/app-store.tsx`
- Test: `tests/expense-delete.test.ts`

**Interfaces:**
- `ExpenseRow` accepts `onDelete?: () => void` and no longer accepts a default visible trailing delete button.
- Store exposes `restoreExpense(id: string): void` alongside `deleteExpense`.
- Delete behavior remains soft-delete and uses the existing sync queue.

- [ ] **Step 1: Write store restore/delete tests**

```ts
test("a deleted expense can be restored with a newer client timestamp", () => {
  const deleted = softDelete(expense, "2026-10-02T10:00:00.000Z");
  const restored = restore(deleted, "2026-10-02T10:01:00.000Z");
  assert.equal(restored.deletedAt, null);
  assert.ok(restored.updatedAt > deleted.updatedAt);
});
```

- [ ] **Step 2: Implement `restoreExpense` and the existing soft-delete contract**

Restore the matching expense with `deletedAt: null`, update its timestamp, queue an expense upsert, and track only the non-sensitive event metadata already used by analytics.

- [ ] **Step 3: Implement the row gesture**

Wrap the row in `GestureDetector` and a `Gesture.Pan`. Track `translateX` with Reanimated, clamp the row with resistance beyond `-112`, show a destructive background behind it, and commit deletion when release distance exceeds `112` or velocity is below `-700`. Use a 400ms, `dampingRatio: 0.8` spring for snap-back/settle and schedule deletion once from `onEnd`.

- [ ] **Step 4: Add a brief undo affordance and remove the old modal/button**

History keeps the deleted id and shows a small snackbar with Undo for a few seconds. Undo calls `restoreExpense`; the default row no longer renders `Trash2`, and the delete confirmation modal is removed.

- [ ] **Step 5: Run gesture/store checks and commit**

Run: `node --experimental-strip-types --test tests/expense-delete.test.ts`, `npm run typecheck`, and `npm run lint`.

```bash
git add src/components/expense-row.tsx src/app/'(tabs)'/history.tsx src/lib/app-store.tsx tests/expense-delete.test.ts
git commit -m "feat: swipe to delete expenses"
```

### Task 4: Animate theme changes

**Files:**
- Modify: `src/theme/theme-provider.tsx`
- Modify: `src/app/_layout.tsx`
- Test: `tests/theme-provider.test.ts`

**Interfaces:**
- Existing `useLedgerTheme()` API remains compatible.
- `setMode` updates the persisted mode and starts a 260ms visual transition.

- [ ] **Step 1: Write provider transition-state tests**

```ts
test("theme mode resolves explicit values and system fallback", () => {
  assert.equal(resolveThemeMode("dark", "light"), "dark");
  assert.equal(resolveThemeMode("system", "dark"), "dark");
});
```

- [ ] **Step 2: Add the previous-background overlay transition**

Capture the previous resolved background, update the palette, and render an absolute `Animated.View` above the navigator that fades from the previous background to transparent over 260ms. Use `useReducedMotion` to skip the fade when requested.

- [ ] **Step 3: Verify navigation and status-bar colors remain synchronized**

Keep the existing navigation theme memo keyed by `colors` and `resolvedMode`; ensure the overlay has `pointerEvents="none"` and cannot block navigation.

- [ ] **Step 4: Run checks and commit**

Run: `node --experimental-strip-types --test tests/theme-provider.test.ts`, `npm run typecheck`, and `npm run lint`.

```bash
git add src/theme/theme-provider.tsx src/app/_layout.tsx tests/theme-provider.test.ts
git commit -m "feat: animate Walletly theme changes"
```

### Task 5: Full verification and simulator QA

**Files:**
- Modify: `README.md` if run instructions need updating.
- Test: existing test suite plus focused tests from Tasks 1–4.

- [ ] **Step 1: Run the full automated suite**

Run: `npm run typecheck`, `npm run lint`, and `npm test -- --runInBand`.

Expected: zero TypeScript errors, zero lint errors, and all tests passing.

- [ ] **Step 2: Run Expo Doctor**

Run: `npm run doctor`.

Expected: no new dependency or configuration issue introduced by this work.

- [ ] **Step 3: Refresh the iOS simulator**

Run from the project directory:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first npx expo start --clear --ios --host localhost
```

Check History with a real expense: swipe right-to-left, release below the threshold, release past the threshold, use Undo, and edit a row by tapping its non-gesture area. Check Manage icon selection, Settings language switching, and light/dark theme transitions.

- [ ] **Step 4: Commit only implementation files after QA**

```bash
git status --short
git diff --check
git log -5 --oneline
```

Leave unrelated user changes untouched.
