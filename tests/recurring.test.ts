import assert from "node:assert/strict";
import test from "node:test";

import { materializeDueRecurringRules, nextOccurrenceDate, recurringOccurrenceId } from "../src/lib/recurring.ts";
import type { RecurringRule } from "../src/lib/types.ts";

const base: RecurringRule = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "user",
  kind: "expense",
  amount: 20,
  currency: "USD",
  accountId: "cash",
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

test("advances recurring dates weekly and clamps month ends", () => {
  assert.equal(nextOccurrenceDate("2026-10-05", "weekly"), "2026-10-12");
  assert.equal(nextOccurrenceDate("2026-10-31", "monthly"), "2026-11-30");
  assert.equal(nextOccurrenceDate("2028-01-31", "monthly"), "2028-02-29");
});

test("materializes every overdue date once and advances to the next future date", async () => {
  const result = await materializeDueRecurringRules([{ ...base, frequency: "weekly" }], "2026-10-21");
  assert.deepEqual(result.transactions.map((item) => item.occurrenceDate), ["2026-10-05", "2026-10-12", "2026-10-19"]);
  assert.equal(result.rules[0]?.nextRunDate, "2026-10-26");
  assert.equal(result.transactions[0]?.expense?.note, "Subscription");
  assert.equal(result.transactions[0]?.expense?.spentAt.slice(0, 10), "2026-10-05");
});

test("recurring occurrence IDs are stable and different due dates cannot collide", async () => {
  const original = await recurringOccurrenceId(base.id, "2026-10-05");
  assert.equal(await recurringOccurrenceId(base.id, "2026-10-05"), original);
  assert.notEqual(await recurringOccurrenceId(base.id, "2026-10-12"), original);
  assert.match(original, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("archived and future rules do not materialize", async () => {
  const result = await materializeDueRecurringRules([
    { ...base, id: "archived", archivedAt: base.updatedAt },
    { ...base, id: "future", nextRunDate: "2026-10-22" },
  ], "2026-10-21");
  assert.equal(result.transactions.length, 0);
  assert.equal(result.rules[0]?.nextRunDate, "2026-10-05");
  assert.equal(result.rules[1]?.nextRunDate, "2026-10-22");
});
