import assert from "node:assert/strict";
import test from "node:test";

import { exportWalletlyData } from "../src/lib/export-data.ts";
import { goalContributionRow, savingsGoalRow, toGoalContribution, toSavingsGoal } from "../src/lib/mappers.ts";
import type { PersistedAppData, SavingsGoal } from "../src/lib/types.ts";

const goal: SavingsGoal = { id: "g", userId: "u", name: 'Trip, "summer"', targetAmount: 1000, currency: "USD", icon: "plane", deadline: "2027-01-01", archivedAt: "2026-10-05T12:00:00Z", deletedAt: null, updatedAt: "2026-10-05T12:00:00Z" };
const data: PersistedAppData = {
  profile: null, expenses: [], categories: [], paymentMethods: [], tags: [], incomeEntries: [], budgets: [], categoryBudgets: [], recurringRules: [], accounts: [], accountAdjustments: [], syncQueue: [],
  savingsGoals: [goal, { ...goal, id: "deleted", deletedAt: goal.updatedAt }],
  goalContributions: [{ id: "c", goalId: goal.id, userId: goal.userId, amount: 20, currency: goal.currency, kind: "deposit", occurredOn: "2026-10-05", note: "=HYPERLINK()", deletedAt: null, updatedAt: goal.updatedAt }, { id: "hidden", goalId: "deleted", userId: goal.userId, amount: 10, currency: goal.currency, kind: "deposit", occurredOn: "2026-10-05", note: "", deletedAt: null, updatedAt: goal.updatedAt }],
};

test("goal mappers round trip every financial and lifecycle field", () => {
  assert.deepEqual(toSavingsGoal(savingsGoalRow(goal)), goal);
  assert.deepEqual(toGoalContribution(goalContributionRow(data.goalContributions[0])), data.goalContributions[0]);
});

test("JSON includes archived goals and contributions but excludes deleted goals and their history", () => {
  const exported = JSON.parse(exportWalletlyData(data, "json"));
  assert.deepEqual(exported.savingsGoals, [goal]);
  assert.deepEqual(exported.goalContributions, [data.goalContributions[0]]);
  assert.equal(exported.syncQueue, undefined);
});

test("CSV appends relational goal fields, quotes text, and neutralizes spreadsheet formulas", () => {
  const csv = exportWalletlyData(data, "csv");
  assert.ok(csv.startsWith("type,id,amount,currency,date,category,note,month,goal_id,name,target_amount,deadline,archived_at,icon,kind\n"));
  assert.ok(csv.includes('"Trip, ""summer"""'));
  assert.ok(csv.includes('"\'=HYPERLINK()"'));
  assert.ok(csv.includes('"goal_contribution","c","20","USD"'));
  assert.ok(!csv.includes('"hidden"'));
});
