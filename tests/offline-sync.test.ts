import assert from "node:assert/strict";
import test from "node:test";

import { flushOperations, MAX_SYNC_OPERATIONS_PER_FLUSH, SYNC_PACE_MS } from "../src/lib/offline-sync.ts";
import type { SyncOperation } from "../src/lib/types.ts";

function operation(index: number): SyncOperation {
  return {
    id: `operation-${index}`,
    table: "expenses",
    action: "delete",
    recordId: `expense-${index}`,
    createdAt: new Date(index).toISOString(),
  };
}

test("sync flush processes a bounded batch and paces successful operations", async () => {
  const queue = Array.from({ length: 30 }, (_, index) => operation(index));
  const sent: string[] = [];
  const delays: number[] = [];

  const result = await flushOperations(queue, {
    send: async (item) => {
      sent.push(item.id);
      return null;
    },
    sleep: async (milliseconds) => { delays.push(milliseconds); },
  });

  assert.equal(MAX_SYNC_OPERATIONS_PER_FLUSH, 25);
  assert.equal(SYNC_PACE_MS, 100);
  assert.deepEqual(sent, queue.slice(0, 25).map((item) => item.id));
  assert.deepEqual(result.completedIds, sent);
  assert.deepEqual(delays, Array.from({ length: 24 }, () => 100));
  assert.equal(result.error, null);
});

test("sync flush retains three attempts with exponential retry delays", async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await flushOperations([operation(1)], {
    send: async () => {
      attempts += 1;
      return attempts < 3 ? "temporary failure" : null;
    },
    sleep: async (milliseconds) => { delays.push(milliseconds); },
  });

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [250, 500]);
  assert.deepEqual(result.completedIds, ["operation-1"]);
  assert.equal(result.error, null);
});

test("sync flush stops after a permanently failed operation", async () => {
  const sent: string[] = [];
  const result = await flushOperations([operation(1), operation(2)], {
    send: async (item) => {
      sent.push(item.id);
      return "still failing";
    },
    sleep: async () => undefined,
    paceMs: 0,
  });

  assert.deepEqual(sent, ["operation-1", "operation-1", "operation-1"]);
  assert.deepEqual(result.completedIds, []);
  assert.equal(result.error, "still failing");
});

test("new goals sync before contributions even if later edits reordered the queue", async () => {
  const contribution = { ...operation(1), table: "goal_contributions" as const, action: "upsert" as const, payload: { goal_id: "goal" } };
  const goal = { ...operation(2), table: "savings_goals" as const, action: "upsert" as const, recordId: "goal" };
  const sent: string[] = [];
  await flushOperations([contribution, goal], { send: async (item) => { sent.push(item.table); return null; }, maxOperations: 1, paceMs: 0 });
  assert.deepEqual(sent, ["savings_goals"]);
});

test("new offline entities flush parent records before their dependent rows", async () => {
  const queue = [
    { ...operation(1), table: "expenses" as const },
    { ...operation(2), table: "account_adjustments" as const },
    { ...operation(3), table: "recurring_rules" as const },
    { ...operation(4), table: "accounts" as const },
    { ...operation(5), table: "category_budgets" as const },
    { ...operation(6), table: "categories" as const },
  ];
  const sent: string[] = [];
  await flushOperations(queue, { send: async (item) => { sent.push(item.table); return null; }, paceMs: 0 });
  assert.deepEqual(sent, ["categories", "recurring_rules", "accounts", "category_budgets", "expenses", "account_adjustments"]);
});
