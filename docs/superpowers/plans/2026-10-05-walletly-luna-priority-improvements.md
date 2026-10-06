# Walletly Luna Priority Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-value product gaps surfaced by comparing Walletly with Luna while preserving Walletly's private, multilingual, web-first PWA identity.

**Architecture:** Add small domain modules for category budgets, recurring transactions, and manual accounts, then thread them through `AppStoreProvider`, Supabase migrations/RLS, offline sync, exports, and the existing single-shell UI. Keep the implementation local-first first; every cloud-backed entity must have a typed model, mapper, queue support, unit tests, RLS tests, and one focused E2E path.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 6, Supabase, Tailwind CSS/design tokens, Playwright, Node test runner, existing Walletly local storage/offline sync.

## Global Constraints

- Repository: `/Users/inomjonismanaliyev/Documents/Codex/2026-09-30/new-chat/outputs/expense-tracker`
- Do not revert existing uncommitted work; savings goals, Graphify output, and currency amount input changes are already present.
- Keep Walletly web-first/PWA-first; do not rebuild Luna's iOS widgets.
- Preserve localization for English, Russian, and Uzbek Latin for every visible string.
- Preserve offline-first mutations and sync recovery for every new user-owned table.
- Use existing semantic classes and design tokens in `src/app/globals.css`; no noisy cards, decorative blobs, heavy borders, or gradient-first visuals.
- Run `npm run typecheck`, `npm run lint`, `npm test`, relevant Playwright specs, `npm run build`, `npm run pwa:validate`, and `npm run seo:validate` before calling the full plan done.

---

## File Structure

- Modify `src/lib/types.ts`: add category budget, recurring rule, account, and account adjustment types.
- Modify `src/lib/budgeting.ts`: add weekly/monthly period helpers, category-budget progress, and budget rollups.
- Create `src/lib/category-budgets.ts`: validation and derived-state helpers for category-level budgets.
- Create `src/lib/recurring.ts`: recurrence scheduling helpers and materialization rules.
- Create `src/lib/accounts.ts`: account balance and adjustment helpers.
- Modify `src/lib/mappers.ts`: add row mappers for new Supabase tables.
- Modify `src/lib/offline-sync.ts`: flush new table operations.
- Modify `src/lib/app-store.tsx`: expose store methods for category budgets, recurring transactions, accounts, and adjustments.
- Modify `src/lib/export-data.ts`: include new entities in JSON and CSV exports.
- Modify `src/lib/i18n.ts`: add all copy in `en`, `ru`, and `uz`.
- Modify `src/components/walletly-app.tsx`: add category-budget UI, recurring UI, account UI, richer demo state, and dashboard/insights summaries.
- Modify `src/components/savings-goals.tsx`: keep goals compatible with account summaries; do not duplicate account balance logic here.
- Create Supabase migration `supabase/migrations/202610050001_luna_priority_improvements.sql`.
- Create Supabase test `supabase/tests/luna_priority_improvements.sql`.
- Add/modify tests under `tests/` and `tests/e2e/`.
- Create docs `docs/luna-priority-improvements.md` and update `docs/release-checklist.md`.
- Add public pages under `src/app/features/page.tsx`, `src/app/guides/page.tsx`, and `src/app/guides/manual-budgeting/page.tsx`.

---

### Task 1: Category Budgets Domain

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/budgeting.ts`
- Create: `src/lib/category-budgets.ts`
- Test: `tests/category-budgets.test.ts`

**Interfaces:**
- Produces: `CategoryBudget`, `CategoryBudgetDraft`, `BudgetCadence`, `validateCategoryBudget(draft, categories)`, `categoryBudgetStatus(budget, expenses, today)`.
- Consumes: existing `Expense`, `Category`, `monthKey`, and `sumAmounts`.

- [ ] **Step 1: Write the failing unit tests**

Add `tests/category-budgets.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { categoryBudgetStatus, validateCategoryBudget } from "../src/lib/category-budgets.ts";
import type { Category, CategoryBudget, Expense } from "../src/lib/types.ts";

const categories: Category[] = [
  { id: "food", userId: null, name: "Food", color: "#2B8A68", icon: "utensils", kind: "global", archivedAt: null, updatedAt: "2026-10-01T00:00:00.000Z" },
];

const expenses: Expense[] = [
  { id: "e1", userId: "user", amount: 25, currency: "USD", spentAt: "2026-10-06T10:00:00.000Z", categoryId: "food", paymentMethodId: "cash", note: "", tagIds: [], deletedAt: null, updatedAt: "2026-10-06T10:00:00.000Z" },
  { id: "e2", userId: "user", amount: 90, currency: "USD", spentAt: "2026-10-14T10:00:00.000Z", categoryId: "food", paymentMethodId: "cash", note: "", tagIds: [], deletedAt: null, updatedAt: "2026-10-14T10:00:00.000Z" },
];

test("validates category budget drafts", () => {
  assert.equal(validateCategoryBudget({ categoryId: "food", amount: 100, currency: "USD", cadence: "weekly" }, categories), null);
  assert.equal(validateCategoryBudget({ categoryId: "missing", amount: 100, currency: "USD", cadence: "weekly" }, categories), "categoryBudgets.categoryError");
  assert.equal(validateCategoryBudget({ categoryId: "food", amount: 0, currency: "USD", cadence: "weekly" }, categories), "categoryBudgets.amountError");
});

test("calculates weekly and monthly category budget windows", () => {
  const weekly: CategoryBudget = { id: "b1", userId: "user", categoryId: "food", amount: 50, currency: "USD", cadence: "weekly", deletedAt: null, updatedAt: "2026-10-01T00:00:00.000Z" };
  const monthly: CategoryBudget = { ...weekly, id: "b2", amount: 200, cadence: "monthly" };
  assert.deepEqual(categoryBudgetStatus(weekly, expenses, "2026-10-08"), { spent: 25, remaining: 25, percentage: 50, periodLabel: "2026-W41" });
  assert.deepEqual(categoryBudgetStatus(monthly, expenses, "2026-10-15"), { spent: 115, remaining: 85, percentage: 57.5, periodLabel: "2026-10" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/category-budgets.test.ts`

Expected: FAIL because `src/lib/category-budgets.ts` and `CategoryBudget` do not exist.

- [ ] **Step 3: Add types**

In `src/lib/types.ts`, add:

```ts
export type BudgetCadence = "weekly" | "monthly";

export type CategoryBudget = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  cadence: BudgetCadence;
  deletedAt: string | null;
  updatedAt: string;
};

export type CategoryBudgetDraft = Pick<CategoryBudget, "categoryId" | "amount" | "currency" | "cadence">;
```

Add `categoryBudgets: CategoryBudget[]` to `PersistedAppData`, and add `"category_budgets"` to `SyncOperation["table"]`.

- [ ] **Step 4: Implement domain helper**

Create `src/lib/category-budgets.ts`:

```ts
import { WALLETLY_CURRENCIES } from "@/lib/constants";
import { monthKey } from "@/lib/budgeting";
import type { Category, CategoryBudget, CategoryBudgetDraft, Expense } from "@/lib/types";

export type CategoryBudgetError = "categoryBudgets.categoryError" | "categoryBudgets.amountError" | "categoryBudgets.currencyError" | "categoryBudgets.cadenceError";

function weekKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : new Date(value);
  const day = (date.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + yearStart.getUTCDay() + 1) / 7);
  return `${monday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function validateCategoryBudget(draft: CategoryBudgetDraft, categories: Category[]): CategoryBudgetError | null {
  if (!categories.some((category) => category.id === draft.categoryId && !category.archivedAt)) return "categoryBudgets.categoryError";
  if (!Number.isFinite(draft.amount) || draft.amount <= 0 || draft.amount >= 1e12) return "categoryBudgets.amountError";
  if (!(WALLETLY_CURRENCIES as readonly string[]).includes(draft.currency)) return "categoryBudgets.currencyError";
  if (draft.cadence !== "weekly" && draft.cadence !== "monthly") return "categoryBudgets.cadenceError";
  return null;
}

export function categoryBudgetStatus(budget: CategoryBudget, expenses: Expense[], today: string | Date) {
  const periodLabel = budget.cadence === "weekly" ? weekKey(today) : monthKey(today);
  const spent = expenses
    .filter((expense) => !expense.deletedAt && expense.categoryId === budget.categoryId && expense.currency === budget.currency)
    .filter((expense) => (budget.cadence === "weekly" ? weekKey(expense.spentAt) : monthKey(expense.spentAt)) === periodLabel)
    .reduce((sum, expense) => sum + expense.amount, 0);
  return {
    spent,
    remaining: budget.amount - spent,
    percentage: budget.amount > 0 ? spent / budget.amount * 100 : 0,
    periodLabel,
  };
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- tests/category-budgets.test.ts
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add src/lib/types.ts src/lib/category-budgets.ts tests/category-budgets.test.ts
git commit -m "feat: add category budget domain"
```

---

### Task 2: Category Budgets Persistence And UI

**Files:**
- Modify: `src/lib/app-store.tsx`
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/offline-sync.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/components/walletly-app.tsx`
- Create: `supabase/migrations/202610050001_luna_priority_improvements.sql`
- Create: `supabase/tests/luna_priority_improvements.sql`
- Test: `tests/e2e/category-budgets.spec.ts`

**Interfaces:**
- Consumes: Task 1 `CategoryBudgetDraft` and `validateCategoryBudget`.
- Produces: store methods `saveCategoryBudget(draft, id?)`, `deleteCategoryBudget(id)`.

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/category-budgets.spec.ts`:

```ts
import { expect, test } from "playwright/test";

import { enterDemo, saveExpense } from "./helpers";

test("demo user can set a weekly category budget and see progress", async ({ page }) => {
  await enterDemo(page);
  await saveExpense(page, "25", "Lunch under weekly cap");
  await page.goto("/insights");
  await page.getByRole("button", { name: "Expenses" }).click();
  await page.getByRole("button", { name: "Category budgets" }).click();
  await page.getByRole("button", { name: "Food" }).click();
  await page.getByRole("textbox", { name: "Budget amount" }).fill("50");
  await page.getByRole("button", { name: "Weekly" }).click();
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByText("Food weekly budget")).toBeVisible();
  await expect(page.getByText(/UZS|USD|RUB|EUR|GBP/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Food budget progress" })).toHaveAttribute("aria-valuenow", "50");
});
```

- [ ] **Step 2: Add persistence surfaces**

Implement mappers in `src/lib/mappers.ts`:

```ts
export const toCategoryBudget = (row: Row): CategoryBudget => ({
  id: row.id as string,
  userId: row.user_id as string,
  categoryId: row.category_id as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  cadence: row.cadence as CategoryBudget["cadence"],
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const categoryBudgetRow = (item: CategoryBudget) => ({
  id: item.id,
  user_id: item.userId,
  category_id: item.categoryId,
  amount: item.amount,
  currency: item.currency,
  cadence: item.cadence,
  deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt,
  updated_at: item.updatedAt,
});
```

Wire `category_budgets` into `src/lib/offline-sync.ts` with the same `upsert`/soft-delete pattern used by `budgets`.

- [ ] **Step 3: Add Supabase table and RLS**

In `supabase/migrations/202610050001_luna_priority_improvements.sql`, start with:

```sql
create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  cadence text not null check (cadence in ('weekly', 'monthly')),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index category_budgets_user_category_currency_cadence_unique
  on public.category_budgets (user_id, category_id, currency, cadence)
  where deleted_at is null;

create trigger category_budgets_keep_latest
  before update on public.category_budgets
  for each row execute function public.keep_latest_client_write();

alter table public.category_budgets enable row level security;

create policy "category_budgets_select_own" on public.category_budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "category_budgets_insert_own" on public.category_budgets for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and (c.kind = 'global' or c.user_id = (select auth.uid())))
);
create policy "category_budgets_update_own" on public.category_budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "category_budgets_delete_own" on public.category_budgets for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.category_budgets to authenticated;
```

- [ ] **Step 4: Add store methods**

In `src/lib/app-store.tsx`, add `categoryBudgets` to initial data, pullRemote, persistence, provider value, and queue operations. Add:

```ts
const saveCategoryBudget = (draft: CategoryBudgetDraft, id?: string): string | undefined => {
  if (!user) return undefined;
  const error = validateCategoryBudget(draft, data.categories);
  if (error) return undefined;
  const now = new Date().toISOString();
  const budget: CategoryBudget = { id: id ?? createId(), userId: user.id, ...draft, deletedAt: null, updatedAt: now };
  setData((current) => ({
    ...current,
    categoryBudgets: mergeLatest(current.categoryBudgets.filter((item) => item.id !== budget.id), [budget]),
    syncQueue: queue(current, { table: "category_budgets", action: "upsert", recordId: budget.id, payload: categoryBudgetRow(budget) }, cloudEnabled),
  }));
  return budget.id;
};
```

- [ ] **Step 5: Add UI and copy**

In `src/components/walletly-app.tsx`, add an `Insights` subtab named `Category budgets`. Show a category picker, `CurrencyAmountInput` labelled `Budget amount`, weekly/monthly controls, a save button, and one progress row per active category budget.

Add `i18n` keys:

```ts
"categoryBudgets.title": "Category budgets",
"categoryBudgets.amount": "Budget amount",
"categoryBudgets.weekly": "Weekly",
"categoryBudgets.monthly": "Monthly",
"categoryBudgets.save": "Save budget",
"categoryBudgets.progress": "{category} {cadence} budget",
"categoryBudgets.empty": "Set weekly or monthly caps for categories you want to keep in check."
```

Add Russian and Uzbek Latin translations in the same object.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
npm test -- tests/category-budgets.test.ts
npm run test:rls
npm run typecheck
npm run lint
E2E_BASE_URL=http://localhost:3000 npm run e2e -- tests/e2e/category-budgets.spec.ts
```

Expected: PASS.

Commit:

```bash
git add src/lib src/components/walletly-app.tsx supabase/migrations/202610050001_luna_priority_improvements.sql supabase/tests/luna_priority_improvements.sql tests/e2e/category-budgets.spec.ts
git commit -m "feat: add category budgets"
```

---

### Task 3: Recurring Income And Expenses

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/recurring.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/offline-sync.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/components/walletly-app.tsx`
- Modify: `supabase/migrations/202610050001_luna_priority_improvements.sql`
- Test: `tests/recurring.test.ts`
- Test: `tests/e2e/recurring.spec.ts`

**Interfaces:**
- Produces: `RecurringRule`, `RecurringRuleDraft`, `materializeDueRecurringRules(rules, now)`, store methods `saveRecurringRule`, `deleteRecurringRule`, `applyDueRecurringRules`.
- Consumes: existing `saveExpense`, `saveIncome`, categories, payment methods, and tags.

- [ ] **Step 1: Write unit tests**

Create `tests/recurring.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { materializeDueRecurringRules, nextOccurrenceDate } from "../src/lib/recurring.ts";
import type { RecurringRule } from "../src/lib/types.ts";

const base: RecurringRule = {
  id: "rule-1",
  userId: "user",
  kind: "expense",
  amount: 20,
  currency: "USD",
  categoryId: "food",
  paymentMethodId: "cash",
  note: "Subscription",
  tagIds: [],
  frequency: "monthly",
  startDate: "2026-10-05",
  nextRunDate: "2026-10-05",
  archivedAt: null,
  deletedAt: null,
  updatedAt: "2026-10-01T00:00:00.000Z",
};

test("calculates next recurring occurrence", () => {
  assert.equal(nextOccurrenceDate("2026-10-05", "weekly"), "2026-10-12");
  assert.equal(nextOccurrenceDate("2026-10-31", "monthly"), "2026-11-30");
});

test("materializes due recurring rules once per due date", () => {
  const result = materializeDueRecurringRules([base], "2026-10-06");
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0]?.note, "Subscription");
  assert.equal(result.rules[0]?.nextRunDate, "2026-11-05");
});
```

- [ ] **Step 2: Add recurrence types**

In `src/lib/types.ts`, add:

```ts
export type RecurringFrequency = "weekly" | "monthly";

export type RecurringRule = {
  id: string;
  userId: string;
  kind: "expense" | "income";
  amount: number;
  currency: string;
  categoryId: string | null;
  paymentMethodId: string | null;
  note: string;
  tagIds: string[];
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  archivedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type RecurringRuleDraft = Omit<RecurringRule, "id" | "userId" | "nextRunDate" | "archivedAt" | "deletedAt" | "updatedAt">;
```

Add `recurringRules: RecurringRule[]` to `PersistedAppData`, and `"recurring_rules"` to sync tables.

- [ ] **Step 3: Implement `src/lib/recurring.ts`**

```ts
import type { ExpenseDraft, IncomeEntryDraft, RecurringFrequency, RecurringRule } from "@/lib/types";

export function nextOccurrenceDate(dateValue: string, frequency: RecurringFrequency) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (frequency === "monthly") {
    const originalDay = date.getUTCDate();
    date.setUTCMonth(date.getUTCMonth() + 1, 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
  }
  return date.toISOString().slice(0, 10);
}

export function materializeDueRecurringRules(rules: RecurringRule[], today: string) {
  const transactions: Array<{ ruleId: string; expense?: ExpenseDraft; income?: IncomeEntryDraft }> = [];
  const updated = rules.map((rule) => {
    if (rule.deletedAt || rule.archivedAt || rule.nextRunDate > today) return rule;
    const occurredAt = new Date(`${rule.nextRunDate}T12:00:00.000Z`).toISOString();
    if (rule.kind === "expense" && rule.categoryId && rule.paymentMethodId) {
      transactions.push({ ruleId: rule.id, expense: { amount: rule.amount, currency: rule.currency, categoryId: rule.categoryId, paymentMethodId: rule.paymentMethodId, spentAt: occurredAt, note: rule.note, tagIds: rule.tagIds } });
    }
    if (rule.kind === "income") {
      transactions.push({ ruleId: rule.id, income: { amount: rule.amount, currency: rule.currency, receivedAt: occurredAt, note: rule.note } });
    }
    return { ...rule, nextRunDate: nextOccurrenceDate(rule.nextRunDate, rule.frequency), updatedAt: new Date().toISOString() };
  });
  return { rules: updated, transactions };
}
```

- [ ] **Step 4: Add UI and store**

Add a Settings section `Recurring` in `src/components/walletly-app.tsx` with fields for type, amount, frequency, category/payment for expenses, note, and start date. Add `applyDueRecurringRules()` in `AppStoreProvider` and call it after hydration for the active user.

- [ ] **Step 5: Add Supabase persistence**

Append this table to `202610050001_luna_priority_improvements.sql`:

```sql
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  category_id uuid references public.categories(id),
  payment_method_id uuid references public.payment_methods(id),
  note text not null default '' check (char_length(note) <= 160),
  tag_ids uuid[] not null default '{}',
  frequency text not null check (frequency in ('weekly', 'monthly')),
  start_date date not null,
  next_run_date date not null,
  archived_at timestamptz,
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_rule_shape check ((kind = 'income' and category_id is null and payment_method_id is null) or (kind = 'expense' and category_id is not null and payment_method_id is not null))
);
```

Add RLS policies mirroring `expenses` ownership.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
npm test -- tests/recurring.test.ts
npm run typecheck
npm run lint
E2E_BASE_URL=http://localhost:3000 npm run e2e -- tests/e2e/recurring.spec.ts
```

Commit:

```bash
git add src/lib src/components/walletly-app.tsx supabase/migrations/202610050001_luna_priority_improvements.sql tests/recurring.test.ts tests/e2e/recurring.spec.ts
git commit -m "feat: add recurring entries"
```

---

### Task 4: Manual Accounts And Balances

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/accounts.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/offline-sync.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/components/walletly-app.tsx`
- Modify: `src/lib/export-data.ts`
- Modify: `supabase/migrations/202610050001_luna_priority_improvements.sql`
- Test: `tests/accounts.test.ts`
- Test: `tests/e2e/accounts.spec.ts`

**Interfaces:**
- Produces: `Account`, `AccountAdjustment`, `accountBalance(account, expenses, incomeEntries, adjustments)`, store methods `saveAccount`, `addAccountAdjustment`.
- Consumes: existing `Expense`, `IncomeEntry`, `PaymentMethod`.

- [ ] **Step 1: Write unit tests**

Create `tests/accounts.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { accountBalance } from "../src/lib/accounts.ts";
import type { Account, AccountAdjustment, Expense, IncomeEntry } from "../src/lib/types.ts";

const account: Account = { id: "cash", userId: "user", name: "Cash", kind: "cash", currency: "USD", startingBalance: 100, archivedAt: null, deletedAt: null, updatedAt: "2026-10-01T00:00:00.000Z" };
const expenses: Expense[] = [{ id: "e1", userId: "user", amount: 25, currency: "USD", spentAt: "2026-10-05T00:00:00.000Z", categoryId: "food", paymentMethodId: "cash", note: "", tagIds: [], deletedAt: null, updatedAt: "2026-10-05T00:00:00.000Z" }];
const income: IncomeEntry[] = [{ id: "i1", userId: "user", amount: 50, currency: "USD", receivedAt: "2026-10-04T00:00:00.000Z", note: "", deletedAt: null, updatedAt: "2026-10-04T00:00:00.000Z" }];
const adjustments: AccountAdjustment[] = [{ id: "a1", accountId: "cash", userId: "user", amount: 10, currency: "USD", occurredOn: "2026-10-06", note: "Found cash", deletedAt: null, updatedAt: "2026-10-06T00:00:00.000Z" }];

test("account balance combines starting balance, income, expenses, and adjustments", () => {
  assert.equal(accountBalance(account, expenses, income, adjustments), 135);
});
```

- [ ] **Step 2: Add account types**

In `src/lib/types.ts`, add:

```ts
export type Account = {
  id: string;
  userId: string;
  name: string;
  kind: "cash" | "bank" | "card";
  currency: string;
  startingBalance: number;
  archivedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type AccountAdjustment = {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  occurredOn: string;
  note: string;
  deletedAt: string | null;
  updatedAt: string;
};
```

- [ ] **Step 3: Implement account helpers**

Create `src/lib/accounts.ts`:

```ts
import type { Account, AccountAdjustment, Expense, IncomeEntry } from "@/lib/types";

export function accountBalance(account: Account, expenses: Expense[], incomeEntries: IncomeEntry[], adjustments: AccountAdjustment[]) {
  const spent = expenses.filter((item) => !item.deletedAt && item.paymentMethodId === account.id && item.currency === account.currency).reduce((sum, item) => sum + item.amount, 0);
  const income = incomeEntries.filter((item) => !item.deletedAt && item.currency === account.currency).reduce((sum, item) => sum + item.amount, 0);
  const adjusted = adjustments.filter((item) => !item.deletedAt && item.accountId === account.id && item.currency === account.currency).reduce((sum, item) => sum + item.amount, 0);
  return account.startingBalance + income - spent + adjusted;
}
```

- [ ] **Step 4: Link accounts to payment methods conservatively**

Use account `id` as a selectable `paymentMethodId` for new account-backed payment methods. In `completeOnboarding`, create both a payment method and an account with the same id for the default method. Do not delete existing payment methods; create accounts only for new user actions and leave legacy expenses readable.

- [ ] **Step 5: Add UI**

Add a Home `Accounts` band and a Manage `Accounts` editor. Each account row shows name, kind, currency, balance, and an `Adjust` action. Adjustment form fields: amount, date, note.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
npm test -- tests/accounts.test.ts
npm run typecheck
npm run lint
E2E_BASE_URL=http://localhost:3000 npm run e2e -- tests/e2e/accounts.spec.ts
```

Commit:

```bash
git add src/lib src/components/walletly-app.tsx supabase/migrations/202610050001_luna_priority_improvements.sql tests/accounts.test.ts tests/e2e/accounts.spec.ts
git commit -m "feat: add manual accounts"
```

---

### Task 5: Demo Data And Insights Story

**Files:**
- Create: `src/lib/demo-data.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/components/walletly-app.tsx`
- Modify: `tests/e2e/helpers.ts`
- Test: `tests/e2e/demo-story.spec.ts`

**Interfaces:**
- Produces: `createDemoData(userId, currency, paymentMethodName): PersistedAppData`.
- Consumes: existing `createInitialData` shape and new entities from Tasks 1-4.

- [ ] **Step 1: Write E2E test**

Create `tests/e2e/demo-story.spec.ts`:

```ts
import { expect, test } from "playwright/test";

import { enterDemo } from "./helpers";

test("local demo opens with meaningful spending, budgets, accounts, and goals", async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByText("Recent activity")).toBeVisible();
  await expect(page.getByText(/Coffee|Groceries|Transport/)).toBeVisible();
  await expect(page.getByText("Savings goals")).toBeVisible();
  await page.goto("/insights");
  await expect(page.getByText("Where it went")).toBeVisible();
  await expect(page.getByText("Category budgets")).toBeVisible();
  await page.goto("/manage");
  await expect(page.getByText("Payment methods and tags")).toBeVisible();
});
```

- [ ] **Step 2: Implement demo seed**

Create `src/lib/demo-data.ts` with deterministic ids and dates relative to `new Date()`:

```ts
import { createId } from "@/lib/id";
import { DEFAULT_PAYMENT_METHODS, GLOBAL_CATEGORIES } from "@/lib/constants";
import type { PersistedAppData } from "@/lib/types";

export function createDemoData(userId: string, currency: string, paymentMethodName: string): PersistedAppData {
  const now = new Date();
  const iso = now.toISOString();
  const paymentId = createId();
  const food = GLOBAL_CATEGORIES[0]?.id ?? "00000000-0000-4000-8000-000000000001";
  const transport = GLOBAL_CATEGORIES[1]?.id ?? "00000000-0000-4000-8000-000000000002";
  return {
    profile: { userId, currency, defaultPaymentMethodId: paymentId, onboardingCompleted: true },
    categories: [...GLOBAL_CATEGORIES],
    paymentMethods: [{ id: paymentId, userId, name: paymentMethodName || DEFAULT_PAYMENT_METHODS[0], archivedAt: null, updatedAt: iso }],
    tags: [{ id: createId(), userId, name: "daily", updatedAt: iso }],
    expenses: [
      { id: createId(), userId, amount: 4.5, currency, spentAt: iso, categoryId: food, paymentMethodId: paymentId, note: "Coffee", tagIds: [], deletedAt: null, updatedAt: iso },
      { id: createId(), userId, amount: 12, currency, spentAt: iso, categoryId: transport, paymentMethodId: paymentId, note: "Transport", tagIds: [], deletedAt: null, updatedAt: iso },
    ],
    incomeEntries: [{ id: createId(), userId, amount: 1200, currency, receivedAt: iso, note: "Demo income", deletedAt: null, updatedAt: iso }],
    budgets: [],
    categoryBudgets: [],
    savingsGoals: [],
    goalContributions: [],
    recurringRules: [],
    accounts: [],
    accountAdjustments: [],
    syncQueue: [],
  };
}
```

Update this object after Tasks 1-4 so it includes category budgets, a savings goal, and an account.

- [ ] **Step 3: Use demo data during onboarding**

In `signInDemo` or `completeOnboarding`, if `user.id === "demo-user"` and the demo account has no expenses, replace `createInitialData()` with `createDemoData("demo-user", currency, paymentMethodName)`.

- [ ] **Step 4: Run checks and commit**

Run:

```bash
npm run typecheck
npm run lint
E2E_BASE_URL=http://localhost:3000 npm run e2e -- tests/e2e/demo-story.spec.ts tests/e2e/expense-lifecycle.spec.ts
```

Commit:

```bash
git add src/lib/demo-data.ts src/lib/app-store.tsx src/components/walletly-app.tsx tests/e2e/demo-story.spec.ts
git commit -m "feat: add guided demo data"
```

---

### Task 6: Public Product And Help Surface

**Files:**
- Create: `src/app/features/page.tsx`
- Create: `src/app/guides/page.tsx`
- Create: `src/app/guides/manual-budgeting/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/lib/seo.ts`
- Modify: `src/app/sitemap.ts`
- Create: `tests/e2e/public-pages.spec.ts`
- Create: `docs/luna-priority-improvements.md`

**Interfaces:**
- Produces: public routes `/features`, `/guides`, `/guides/manual-budgeting`.
- Consumes: existing SEO helpers and app shell styling.

- [ ] **Step 1: Write public-page E2E test**

Create `tests/e2e/public-pages.spec.ts`:

```ts
import { expect, test } from "playwright/test";

test("public marketing pages explain Walletly's web-first budgeting position", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Walletly" })).toBeVisible();
  await page.goto("/features");
  await expect(page.getByText("Private expense tracking for the web")).toBeVisible();
  await expect(page.getByText("Budgets")).toBeVisible();
  await expect(page.getByText("Recurring entries")).toBeVisible();
  await page.goto("/guides/manual-budgeting");
  await expect(page.getByRole("heading", { name: "Manual budgeting with Walletly" })).toBeVisible();
});
```

- [ ] **Step 2: Build pages**

`src/app/features/page.tsx` should include sections for: private web/PWA, category budgets, recurring entries, accounts, insights, exports, multilingual support, and offline sync. Use simple full-width bands and compact feature rows.

`src/app/guides/manual-budgeting/page.tsx` should explain: manual entry habit, weekly vs monthly category caps, account adjustments, recurring income/expenses, and privacy without bank linking.

- [ ] **Step 3: Update SEO and sitemap**

Add `/features`, `/guides`, and `/guides/manual-budgeting` to `src/app/sitemap.ts`. Use `metadata` exports on each page with literal titles and descriptions.

- [ ] **Step 4: Document strategy**

Create `docs/luna-priority-improvements.md` with:

```md
# Walletly Priority Improvements

Walletly's position is private, multilingual, web-first money tracking. Luna is stronger at budget depth and habit formation; Walletly should answer with category budgets, recurring entries, manual accounts, richer demo data, and a public help surface.

## Implemented Scope

- Category-level weekly and monthly budgets
- Recurring income and expenses
- Manual cash, bank, and card accounts
- Seeded local demo data
- Public feature and guide pages

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, targeted Playwright specs, `npm run build`, `npm run pwa:validate`, and `npm run seo:validate`.
```

- [ ] **Step 5: Run checks and commit**

Run:

```bash
npm run seo:validate
npm run typecheck
npm run lint
E2E_BASE_URL=http://localhost:3000 npm run e2e -- tests/e2e/public-pages.spec.ts
```

Commit:

```bash
git add src/app/features src/app/guides src/app/page.tsx src/lib/seo.ts src/app/sitemap.ts docs/luna-priority-improvements.md tests/e2e/public-pages.spec.ts
git commit -m "feat: add public Walletly guide surface"
```

---

### Task 7: Final Verification And Release Notes

**Files:**
- Modify: `docs/release-checklist.md`
- Modify: `README.md`
- Modify: `graphify-out/GRAPH_REPORT.md` only by running Graphify, not by hand.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified release checklist and final limitations.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:rls
npm run build
npm run pwa:validate
npm run seo:validate
E2E_BASE_URL=http://localhost:3000 npm run e2e
graphify update
```

Expected:

- TypeScript exits 0.
- ESLint exits 0.
- Unit/RLS tests exit 0.
- Next build exits 0.
- PWA and SEO validation exit 0.
- Playwright passes mobile, tablet, and desktop projects.
- Graphify updates `graphify-out/`.

- [ ] **Step 2: Update release checklist**

Add to `docs/release-checklist.md`:

```md
## Luna Priority Improvements Verification

- [ ] Category budgets tested in demo and signed-in mode
- [ ] Recurring expense creates exactly one due expense per due date
- [ ] Recurring income creates exactly one due income entry per due date
- [ ] Account balance reflects expenses, income, and adjustments
- [ ] Demo mode opens with meaningful sample data
- [ ] Public feature and guide pages appear in sitemap
- [ ] JSON and CSV exports include new entities
- [ ] Offline-created new entities sync after reconnect
```

- [ ] **Step 3: Update README commands**

Ensure `README.md` lists:

```md
npm run typecheck
npm run lint
npm test
npm run test:rls
npm run build
npm run pwa:validate
npm run seo:validate
```

- [ ] **Step 4: Final commit**

Run `git status --short` and commit only files changed by these tasks:

```bash
git add README.md docs/release-checklist.md graphify-out
git commit -m "docs: verify Walletly priority improvements"
```

---

## Self-Review

- Spec coverage: This plan covers category-level budgets, recurring transactions, accounts, richer savings/demo/insights presentation, public landing/help pages, export/sync/RLS/test coverage, and full verification.
- Placeholder scan: The plan intentionally avoids open-ended `TBD` steps. Every task has concrete files, commands, and expected outcomes.
- Type consistency: Later tasks rely on names introduced earlier: `CategoryBudget`, `RecurringRule`, `Account`, `AccountAdjustment`, and their store methods.

Plan complete and saved to `docs/superpowers/plans/2026-10-05-walletly-luna-priority-improvements.md`.

Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in one session with checkpoints.
