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
