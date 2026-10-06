import assert from "node:assert/strict";
import test from "node:test";

import { accountBalance } from "../src/lib/accounts.ts";
import type { Account, AccountAdjustment, Expense, IncomeEntry } from "../src/lib/types.ts";

const account: Account = { id: "cash", userId: "user", name: "Cash", kind: "cash", currency: "USD", startingBalance: 100, archivedAt: null, deletedAt: null, updatedAt: "2026-10-01T00:00:00.000Z" };
const expenses: Expense[] = [{ id: "e1", userId: "user", amount: 25, currency: "USD", spentAt: "2026-10-05T00:00:00.000Z", categoryId: "food", paymentMethodId: "cash", note: "", tagIds: [], deletedAt: null, updatedAt: "2026-10-05T00:00:00.000Z" }];
const income: IncomeEntry[] = [
  { id: "i1", userId: "user", accountId: "cash", amount: 50, currency: "USD", receivedAt: "2026-10-04T00:00:00.000Z", note: "", deletedAt: null, updatedAt: "2026-10-04T00:00:00.000Z" },
  { id: "i2", userId: "user", accountId: "bank", amount: 500, currency: "USD", receivedAt: "2026-10-04T00:00:00.000Z", note: "Other account", deletedAt: null, updatedAt: "2026-10-04T00:00:00.000Z" },
];
const adjustments: AccountAdjustment[] = [{ id: "a1", accountId: "cash", userId: "user", amount: 10, currency: "USD", occurredOn: "2026-10-06", note: "Found cash", deletedAt: null, updatedAt: "2026-10-06T00:00:00.000Z" }];

test("account balance includes only matching account and currency transactions", () => {
  assert.equal(accountBalance(account, expenses, income, adjustments), 135);
});

test("account balance excludes foreign, other-currency, and deleted rows", () => {
  assert.equal(accountBalance(account, [
    ...expenses,
    { ...expenses[0]!, id: "eur", amount: 500, currency: "EUR" },
    { ...expenses[0]!, id: "deleted", amount: 100, deletedAt: "2026-10-07T00:00:00.000Z" },
    { ...expenses[0]!, id: "foreign", amount: 800, userId: "other" },
  ], [
    ...income,
    { ...income[0]!, id: "deleted-income", amount: 300, deletedAt: "2026-10-07T00:00:00.000Z" },
  ], [
    ...adjustments,
    { ...adjustments[0]!, id: "removed", amount: 500, deletedAt: "2026-10-07T00:00:00.000Z" },
  ]), 135);
});
