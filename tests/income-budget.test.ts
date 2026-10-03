import assert from "node:assert/strict";
import test from "node:test";

import { activeBudget, activeExpenses, activeIncome, monthKey, remainingBudget, sumAmounts } from "../src/lib/budgeting.ts";
import type { Budget, Expense, IncomeEntry } from "../src/lib/types.ts";

const income: IncomeEntry[] = [
  { id: "income-1", userId: "user", amount: 3000, currency: "USD", receivedAt: "2026-10-02T09:00:00.000Z", note: "Salary", deletedAt: null, updatedAt: "2026-10-02T09:00:00.000Z" },
  { id: "income-2", userId: "user", amount: 500, currency: "EUR", receivedAt: "2026-10-03T09:00:00.000Z", note: "Other", deletedAt: null, updatedAt: "2026-10-03T09:00:00.000Z" },
  { id: "income-3", userId: "user", amount: 100, currency: "USD", receivedAt: "2026-10-04T09:00:00.000Z", note: "Deleted", deletedAt: "2026-10-04T10:00:00.000Z", updatedAt: "2026-10-04T10:00:00.000Z" },
];
const expenses: Expense[] = [{ id: "expense-1", userId: "user", amount: 750, currency: "USD", spentAt: "2026-10-05T09:00:00.000Z", categoryId: "category", paymentMethodId: "payment", note: "", tagIds: [], deletedAt: null, updatedAt: "2026-10-05T09:00:00.000Z" }];
const budgets: Budget[] = [{ id: "budget-1", userId: "user", month: "2026-10", amount: 2000, currency: "USD", deletedAt: null, updatedAt: "2026-10-01T09:00:00.000Z" }];

test("income and budget calculations stay within the selected currency and month", () => {
  assert.equal(monthKey("2026-10-02T09:00:00.000Z"), "2026-10");
  assert.equal(sumAmounts(activeIncome(income, "USD", "2026-10")), 3000);
  assert.equal(sumAmounts(activeExpenses(expenses, "USD", "2026-10")), 750);
  assert.equal(activeBudget(budgets, "USD", "2026-10")?.amount, 2000);
  assert.equal(remainingBudget(budgets, expenses, "USD", "2026-10"), 1250);
  assert.equal(activeIncome(income, "EUR", "2026-10").length, 1);
});
