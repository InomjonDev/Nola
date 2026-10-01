# Walletly Onboarding and Surface Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine Walletly's tour and authentication, personalize Home safely from provider identity, improve empty/action states, add robust live amount formatting, and replace rectangular card noise with consistent continuous controls.

**Architecture:** Establish semantic design tokens first, then implement three disjoint feature slices in parallel: signed-out flow, account identity/Home, and expense entry. Finish with an Insights/surface cleanup and a main-thread integration pass. User-owned persistence moves from one global key to an account-scoped key before Home consumes provider identity.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6, Supabase Auth/Postgres, AsyncStorage, Expo Image, Lucide, React Native Animated, Node 24 test runner.

## Global Constraints

- Tour is shown once per installation and includes a visible Skip action.
- Skip reveals sign-in without starting authentication.
- Returning signed-out users open directly at sign-in.
- Normal phone layouts fit one screen; keyboard and accessibility sizing may use overflow fallback.
- Controls use 44-point minimum targets and continuous curves.
- Utility sections use `colors.background`; modal/elevated contexts may use `colors.surface`.
- Small text must meet at least 4.5:1 contrast in both themes.
- Existing wallet summary and floating tab-bar architecture remain.
- No Apple sign-in, bank sync, OCR, income tracking, or new analytics collection.

---

### Task 1: Semantic Geometry and Shared Choice Controls

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/theme/index.ts`
- Modify: `src/components/chip.tsx`
- Modify: `src/components/text-field.tsx`
- Modify: `src/components/date-picker.tsx`

**Interfaces:**
- Produces: `radius.card`, `radius.control`, `radius.popover`, `radius.sheet`, and existing `radius.full`.
- Produces: `Chip` props `leading?: React.ReactNode`, `size?: "compact" | "regular"`, and `variant?: "filter" | "choice"`.
- Consumers: expense entry, History, Insights, onboarding, and profile/settings controls.

- [ ] **Step 1: Add semantic radius tokens without removing legacy tokens**

```ts
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  card: 12,
  control: 16,
  popover: 20,
  sheet: 28,
  full: 999,
} as const;
```

Install the SDK-compatible provider-image component before parallel work begins:

```bash
npx expo install expo-image
```

- [ ] **Step 2: Extend `Chip` with reusable filter/choice geometry**

```tsx
type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
  size?: "compact" | "regular";
  variant?: "filter" | "choice";
};

export function Chip({ label, selected = false, onPress, leading, size = "regular", variant = "filter" }: ChipProps) {
  const { colors } = useLedgerTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        size === "compact" && styles.compact,
        variant === "choice" && styles.choice,
        { backgroundColor: selected ? colors.accentSoft : colors.surfaceElevated, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      {leading}
      <ThemedText variant="caption" style={{ color: selected ? colors.accentStrong : colors.text }}>{label}</ThemedText>
    </Pressable>
  );
}
```

- [ ] **Step 3: Apply semantic curves to fields and the custom calendar**

Use `radius.control` for `TextField` and the date trigger, `radius.popover` for the calendar, `borderCurve: "continuous"`, and preserve 44-point calendar arrow targets. Do not add one-pixel borders.

- [ ] **Step 4: Verify shared primitives**

Run: `npm run typecheck && npm run lint`

Expected: both commands exit 0 with no diagnostics.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/theme/index.ts src/components/chip.tsx src/components/text-field.tsx src/components/date-picker.tsx
git commit -m "refactor: unify Walletly control geometry"
```

---

### Task 2: Combined Tour and Authentication

**Files:**
- Create: `src/components/auth-tour.tsx`
- Create: `src/components/auth-panel.tsx`
- Modify: `src/app/auth.tsx`
- Modify: `src/app/index.tsx`
- Modify: `src/app/_layout.tsx`
- Delete: `src/app/tour.tsx`

**Interfaces:**
- `AuthTour` consumes `{ onComplete: () => void; onSkip: () => void }`.
- `AuthPanel` owns consent and authentication callbacks currently located in `auth.tsx`.
- `auth.tsx` owns `stage: "loading" | "tour" | "sign-in"` and persists `TOUR_SEEN_KEY`.

- [ ] **Step 1: Extract the three tour slides into `AuthTour`**

```tsx
type AuthTourProps = { onComplete: () => void; onSkip: () => void };

export function AuthTour({ onComplete, onSkip }: AuthTourProps) {
  const [index, setIndex] = useState(0);
  const last = index === slides.length - 1;
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.progress}>{slides.map((slide, dot) => <View key={slide.title} style={[styles.dot, dot === index && styles.activeDot]} />)}</View>
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12}><ThemedText variant="caption">Skip</ThemedText></Pressable>
      </View>
      <Animated.View style={styles.content}>{renderPreview(index)}</Animated.View>
      <View style={styles.actions}>
        {index > 0 ? <Button title="Back" variant="ghost" onPress={() => setIndex(index - 1)} /> : <View />}
        <Button title={last ? "Create my account" : "Continue"} onPress={() => last ? onComplete() : setIndex(index + 1)} />
      </View>
    </View>
  );
}
```

Keep the existing transform/opacity transition and reduce-motion behavior. Pagination dots are indicators, not jump controls, so a user cannot bypass slides accidentally.

- [ ] **Step 2: Extract authentication controls into `AuthPanel`**

Move Google, email magic link, demo, legal links, age consent, error, notice, and loading state into a focused component. Remove the Walletly badge, Tour link, and current promotional hero. Use 24-point page margins and the official local `GoogleLogo`.

- [ ] **Step 3: Gate auth rendering inside `/auth`**

```tsx
const [stage, setStage] = useState<"loading" | "tour" | "sign-in">("loading");

useEffect(() => {
  AsyncStorage.getItem(TOUR_SEEN_KEY).then((seen) => setStage(seen === "true" ? "sign-in" : "tour"));
}, []);

async function finishTour() {
  await AsyncStorage.setItem(TOUR_SEEN_KEY, "true");
  setStage("sign-in");
}

if (stage === "loading") return <BootScreen />;
return <Screen scroll={false}>{stage === "tour" ? <AuthTour onComplete={finishTour} onSkip={finishTour} /> : <AuthPanel />}</Screen>;
```

- [ ] **Step 4: Simplify root routing and remove the tour route**

`index.tsx` redirects every signed-out user to `/auth` after store hydration. Remove tour-key reads from `index.tsx`, remove `tour` from `_layout.tsx`, and delete `src/app/tour.tsx`. Do not gate `auth/callback.tsx`.

- [ ] **Step 5: Verify signed-out routing**

Run Playwright at 375×667 and 430×932. Verify clean storage shows Tour 1; Skip shows sign-in; completing all slides shows sign-in; reload opens sign-in; `/auth/callback` remains reachable; auth controls are absent from the DOM before completion.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth-tour.tsx src/components/auth-panel.tsx src/app/auth.tsx src/app/index.tsx src/app/_layout.tsx src/app/tour.tsx
git commit -m "feat: combine Walletly tour and sign-in"
```

---

### Task 3: Account-Scoped Persistence and Personalized Home

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/app/(tabs)/profile.tsx`
- Modify: `src/components/empty-state.tsx`

**Interfaces:**
- `UserIdentity` gains `avatarUrl?: string | null`.
- `appStorageKey(userId: string): string` returns `walletly.app-data.v2:${userId}`.
- Home consumes `user.name` and `user.avatarUrl`; initials remain the image-error fallback.

- [ ] **Step 1: Add account-key and identity mapping helpers**

```ts
export const APP_STORAGE_PREFIX = "walletly.app-data.v2";
export function appStorageKey(userId: string) { return `${APP_STORAGE_PREFIX}:${userId}`; }

export type UserIdentity = {
  id: string;
  email: string | null;
  isDemo: boolean;
  name?: string | null;
  provider?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
};
```

Map `full_name` or `name` to `name`; do not use `preferred_username`. Map `avatar_url` or `picture` to `avatarUrl`.

- [ ] **Step 2: Partition hydration, persistence, and auth transitions**

Create focused helpers inside `app-store.tsx`:

```ts
function ownsRecord(record: { userId: string }, userId: string) {
  return record.userId === userId;
}

async function readAccountData(userId: string): Promise<PersistedAppData> {
  const saved = await AsyncStorage.getItem(appStorageKey(userId));
  if (!saved) return initialData;

  try {
    const parsed = JSON.parse(saved) as PersistedAppData;
    return {
      ...initialData,
      ...parsed,
      categories: mergeLatest(
        GLOBAL_CATEGORIES,
        (parsed.categories ?? []).filter((item) => item.kind === "global" || ownsRecord(item, userId)),
      ),
      paymentMethods: (parsed.paymentMethods ?? []).filter((item) => ownsRecord(item, userId)),
      tags: (parsed.tags ?? []).filter((item) => ownsRecord(item, userId)),
      expenses: (parsed.expenses ?? []).filter((item) => ownsRecord(item, userId)),
      syncQueue: parsed.syncQueue ?? [],
    };
  } catch {
    return initialData;
  }
}

async function writeAccountData(userId: string, next: PersistedAppData) { await AsyncStorage.setItem(appStorageKey(userId), JSON.stringify(next)); }
```

Before loading another authenticated user, set `data` to `initialData`. Only merge records whose `userId` equals the active user ID; retain global categories. Persist queues under the same account key. Signing out resets memory and removes the demo session marker but does not delete another account's scoped cache.

After restoring a session, call `supabase.auth.getUser()` asynchronously and replace identity metadata when successful.

- [ ] **Step 3: Add provider avatar and real-name helpers**

```ts
function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "W";
}

const fullName = user?.name?.trim() || "there";
const greetingName = fullName === "there" ? fullName : fullName.split(/\s+/)[0];
```

Use Expo Image for `avatarUrl` with a circular 44-point frame. On load error or missing URL, render initials. Apply the same identity treatment in Profile.

- [ ] **Step 4: Redesign Home actions and empty activity**

Keep all four actions. Remove rectangular backgrounds and borders. Render transparent 44-point action targets with circular icon wells; Add uses `accent`, others use `surfaceElevated`. Hide View all when empty. Use `EmptyState` with `compact` and `action` props on the application background.

- [ ] **Step 5: Unframe Profile stats**

Use `colors.background` or transparent layout for Profile stats, remove one-pixel borders around noninteractive groups, and preserve separators only between actionable rows. Keep modal sheets on `colors.surface`.

- [ ] **Step 6: Verify account boundaries and Home**

Test session A → sign out → session B with distinct local expenses. Expected: B sees no A totals, history, tags, payment methods, categories, or queued operations. Verify provider real name/photo or initials in Home and Profile, and transparent Home empty state in both themes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/constants.ts src/lib/types.ts src/lib/app-store.tsx 'src/app/(tabs)/index.tsx' 'src/app/(tabs)/profile.tsx' src/components/empty-state.tsx
git commit -m "fix: isolate accounts and personalize Walletly home"
```

---

### Task 4: Live Currency Formatting and Expense Controls

**Files:**
- Create: `src/lib/currency-input.ts`
- Create: `tests/currency-input.test.ts`
- Modify: `package.json`
- Modify: `src/app/add-expense.tsx`
- Modify: `src/components/currency-carousel.tsx`
- Modify: `src/components/tag-picker.tsx`

**Interfaces:**
- `formatAmountDraft(input: string, locale?: string): AmountDraft`
- `parseAmountValue(canonical: string): number | null`
- `AmountDraft = { canonical: string; display: string; complete: boolean }`

- [ ] **Step 1: Write currency parsing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { formatAmountDraft, parseAmountValue } from "../src/lib/currency-input.ts";

test("groups typed digits", () => assert.deepEqual(formatAmountDraft("1234", "en-US"), { canonical: "1234", display: "1,234", complete: true }));
test("preserves a trailing decimal", () => assert.deepEqual(formatAmountDraft("12.", "en-US"), { canonical: "12.", display: "12.", complete: false }));
test("parses pasted comma decimal", () => assert.equal(parseAmountValue(formatAmountDraft("1 234,50", "ru-RU").canonical), 1234.5));
test("limits fraction digits", () => assert.equal(formatAmountDraft("12.345", "en-US").canonical, "12.34"));
test("rejects incomplete values", () => assert.equal(parseAmountValue("12."), null));
```

- [ ] **Step 2: Add the Node 24 test script and verify failure**

Add `"test": "node --experimental-strip-types --test tests/**/*.test.ts"` to `package.json`.

Run: `npm test`

Expected: FAIL because `src/lib/currency-input.ts` does not exist.

- [ ] **Step 3: Implement pure amount formatting**

The helper determines locale group/decimal separators with `Intl.NumberFormat(...).formatToParts`, strips currency symbols and spaces, treats the last separator as decimal when appropriate, caps the integer portion at 12 digits and the fraction at two digits, groups the integer portion, preserves a trailing decimal separator, and returns `complete: false` for empty or trailing-decimal drafts. `parseAmountValue` returns null for incomplete, nonfinite, zero, negative, or overflow values.

- [ ] **Step 4: Verify the utility passes**

Run: `npm test`

Expected: five passing tests and exit 0.

- [ ] **Step 5: Connect formatted and canonical state to expense entry**

Initialize with `formatAmountDraft(existing ? String(existing.amount) : "")`. Display `draft.display`, save `parseAmountValue(draft.canonical)`, and feed the formatted display into `CurrencyCarousel`. Preserve caret position by counting digits before the current selection and locating the same digit boundary after reformatting.

Remove the visible title/eyebrow. Keep only a right-aligned X with an accessibility label of New expense or Edit expense. Keep all content within the no-scroll phone layout.

- [ ] **Step 6: Apply shared choice geometry and dark currency contrast**

Use `Chip variant="choice"` for category/payment/tag choices where practical. Use `radius.control` on remaining choice rows. In the currency wheel, remove inactive-label opacity, use full `textMuted`, and style the trigger with `accentSoft` and `accentStrong`.

- [ ] **Step 7: Verify expense behavior**

Run amount sequences, deletion, middle insertion, paste `$1,234.50`, paste `1 234,50`, edit an existing expense, switch among UZS/USD/RUB, and save. Verify dark-mode trigger and wheel labels remain legible.

- [ ] **Step 8: Commit**

```bash
git add src/lib/currency-input.ts tests/currency-input.test.ts package.json src/app/add-expense.tsx src/components/currency-carousel.tsx src/components/tag-picker.tsx
git commit -m "feat: format expense amounts while typing"
```

---

### Task 5: Unframed Insights and Utility Surfaces

**Files:**
- Modify: `src/app/(tabs)/analytics.tsx`
- Modify: `src/app/(tabs)/manage.tsx`
- Modify: `design-system/walletly/MASTER.md`

**Interfaces:**
- Consumes: semantic radius tokens and extended `Chip` from Task 1.
- Produces: accessible bar elements labeled with period and formatted amount.

- [ ] **Step 1: Remove the Insights chart frame**

Remove `backgroundColor`, `borderColor`, and `borderWidth` from the chart container. Keep layout grouping through 24-point gaps. Change bar tracks and bars to `radius.full`.

- [ ] **Step 2: Add per-bar accessibility**

```tsx
<View
  accessible
  accessibilityLabel={`${bar.label}: ${formatMoney(bar.amount, currency)}`}
  key={bar.label}
  style={styles.barItem}
>
  <View style={styles.barTrack}><View style={[styles.bar, barStyle]} /></View>
  <ThemedText variant="micro" muted>{bar.label}</ThemedText>
</View>
```

- [ ] **Step 3: Unframe category summaries and Manage list**

Use `colors.background` or transparent layout, remove one-pixel borders around noninteractive groups, and preserve separators only between actionable rows. Keep modal sheets on `colors.surface`.

- [ ] **Step 4: Update the Walletly design-system record**

Document semantic radii, transparent utility sections, the single-surface Home rule, action-rail geometry, and dark currency contrast rules in `design-system/walletly/MASTER.md`.

- [ ] **Step 5: Verify visual hierarchy**

Capture 375×667 and 430×932 screenshots for Home empty/populated, Add Expense, calendar open, Insights empty/populated, Manage, and Profile in light and dark appearances. Verify no text clipping, overlapping, or accidental white/dark cards.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(tabs)/analytics.tsx' 'src/app/(tabs)/manage.tsx' design-system/walletly/MASTER.md
git commit -m "style: unframe Walletly utility surfaces"
```

---

### Task 6: Integration and Release Verification

**Files:**
- Modify only files requiring integration fixes discovered by checks.

**Interfaces:**
- Consumes all tasks.
- Produces a verified Expo application with no unresolved type, lint, routing, data-isolation, or viewport issues.

- [ ] **Step 1: Run automated checks**

Run:

```bash
npm test
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform web
git diff --check
```

Expected: currency tests pass, typecheck/lint exit 0, Expo Doctor reports 21/21, web export completes, and diff check is empty.

- [ ] **Step 2: Run signed-out flow tests**

At 375×667 and 430×932 verify clean install, Skip, Back, all Continue steps, restart, logout, direct `/auth`, Google launch, email link notice, demo, keyboard open, and reduced motion.

- [ ] **Step 3: Run signed-in workflow tests**

Verify account switching, provider identity, empty and populated Home, add/edit expense, calendar, category/payment/tag selection, amount formatting, currency wheel, Insights, Manage, Profile, Settings, and floating navigation in both themes.

- [ ] **Step 4: Review changed-file scope**

Run: `git status --short` and `git diff --stat HEAD~5..HEAD`

Expected: only approved Walletly implementation, test, dependency, design-system, and documentation files appear; pre-existing unrelated user changes remain untouched.

- [ ] **Step 5: Record integration fixes without creating an empty commit**

If Steps 1–3 require code changes, stage their exact paths and amend the commit for the task that owns those files with `git commit --amend --no-edit`. If no integration changes are needed, leave the verified task commits unchanged.
