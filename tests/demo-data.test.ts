import assert from "node:assert/strict";
import test from "node:test";

import { createDemoData } from "../src/lib/demo-data.ts";

test("demo seed includes connected sample spending, budgets, accounts, goals, and future recurring activity", () => {
  const data = createDemoData("demo-user", "USD", "Cash");

  assert.equal(data.profile?.defaultPaymentMethodId, data.paymentMethods.find((item) => item.name === "Cash")?.id);
  assert.ok(data.expenses.length > 0);
  assert.ok(data.incomeEntries.some((item) => item.accountId === data.accounts.find((account) => account.name === "Cash")?.id));
  assert.ok(data.categoryBudgets.length > 0);
  assert.ok(data.recurringRules.every((rule) => rule.nextRunDate > new Date().toISOString().slice(0, 10)));
  assert.ok(data.savingsGoals.length > 0);
  assert.ok(data.goalContributions.every((item) => data.savingsGoals.some((goal) => goal.id === item.goalId)));
  assert.deepEqual(data.syncQueue, []);
});
