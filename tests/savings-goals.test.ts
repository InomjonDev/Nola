import assert from "node:assert/strict";
import test from "node:test";

import { goalCompletionSnapshot, goalProgress, newlyCompletedByDeposit, normalizeGoalData, validateContribution, validateGoal } from "../src/lib/savings-goals.ts";
import type { GoalContribution, SavingsGoal } from "../src/lib/types.ts";

const goal: SavingsGoal = { id: "goal", userId: "user", name: "Emergency fund", targetAmount: 100, currency: "USD", icon: "wallet", deadline: "2026-10-10", archivedAt: null, deletedAt: null, updatedAt: "2026-10-01T00:00:00Z" };
const deposit: GoalContribution = { id: "entry", goalId: "goal", userId: "user", amount: 60.1, currency: "USD", kind: "deposit", occurredOn: "2026-10-01", note: "", deletedAt: null, updatedAt: goal.updatedAt };

test("goal progress uses cents and isolates owner, goal, currency, and deleted entries", () => {
  const entries = [deposit, { ...deposit, id: "two", amount: 0.2 }, { ...deposit, id: "three", kind: "withdrawal" as const, amount: 10.3 }, { ...deposit, id: "other-owner", userId: "other" }, { ...deposit, id: "other-goal", goalId: "other" }, { ...deposit, id: "other-currency", currency: "EUR" }, { ...deposit, id: "deleted", deletedAt: goal.updatedAt }];
  const status = goalProgress(goal, entries, "2026-10-05");
  assert.equal(status.saved, 50);
  assert.equal(status.remaining, 50);
  assert.equal(status.percentage, 50);
  assert.equal(status.reached, false);
});

test("retries with the same contribution ID count only once using latest version", () => {
  assert.equal(goalProgress(goal, [deposit, deposit]).saved, 60.1);
  assert.equal(goalProgress(goal, [deposit, { ...deposit, deletedAt: goal.updatedAt, updatedAt: "2026-10-02T00:00:00Z" }]).saved, 0);
});

test("reached goals clamp only the visual progress and overdue uses calendar dates", () => {
  const reached = goalProgress(goal, [{ ...deposit, amount: 120 }], "2026-10-11");
  assert.equal(reached.reached, true);
  assert.equal(reached.percentage, 100);
  assert.equal(reached.saved, 120);
  assert.equal(reached.remaining, 0);
  assert.equal(reached.overdue, false);
  assert.equal(goalProgress(goal, [], "2026-10-10").overdue, false);
  assert.equal(goalProgress(goal, [], "2026-10-11").overdue, true);
  assert.equal(goalProgress({ ...goal, deadline: null }, [], "2026-10-11").overdue, false);
});

test("negative balances from concurrent offline withdrawals remain visible", () => {
  const status = goalProgress(goal, [{ ...deposit, kind: "withdrawal", amount: 20 }]);
  assert.equal(status.saved, -20);
  assert.equal(status.remaining, 120);
  assert.equal(status.negativeBalance, true);
  assert.equal(status.percentage, 0);
});

test("completion celebrates only a new deposit that crosses the target", () => {
  const belowTarget = goalCompletionSnapshot(goal, [deposit]);
  const completed = { ...deposit, id: "finish", amount: 39.9 };
  assert.equal(newlyCompletedByDeposit(goal, [deposit, completed], belowTarget), true);
  assert.equal(newlyCompletedByDeposit(goal, [deposit], undefined), false);
  assert.equal(newlyCompletedByDeposit(goal, [deposit, { ...completed, kind: "withdrawal" }], belowTarget), false);
  assert.equal(newlyCompletedByDeposit({ ...goal, targetAmount: 50 }, [deposit], belowTarget), false);
  const alreadyCompleted = goalCompletionSnapshot(goal, [deposit, completed]);
  assert.equal(newlyCompletedByDeposit({ ...goal, targetAmount: 50 }, [deposit, completed], alreadyCompleted), false);
});

test("goal validation rejects invalid money, names, dates and unsupported currencies", () => {
  assert.equal(validateGoal(goal), null);
  assert.equal(validateGoal({ ...goal, name: " " }), "goals.nameError");
  assert.equal(validateGoal({ ...goal, icon: "invalid" as SavingsGoal["icon"] }), "goals.iconError");
  for (const targetAmount of [0, -1, NaN, Infinity, 1.001, 1e12]) assert.equal(validateGoal({ ...goal, targetAmount }), "goals.amountError");
  assert.equal(validateGoal({ ...goal, deadline: "2026-02-30" }), "goals.dateError");
  assert.equal(validateGoal({ ...goal, currency: "XXX" }), "goals.currencyError");
  assert.equal(validateGoal({ ...goal, currency: "EUR" }, goal, [deposit]), "goals.currencyLocked");
  assert.equal(validateGoal({ ...goal, currency: "EUR" }, goal, [{ ...deposit, deletedAt: goal.updatedAt }]), "goals.currencyLocked");
  assert.equal(validateGoal({ ...goal, targetAmount: 200 }, goal, [deposit]), null);
});

test("contributions reject insufficient withdrawals, archived goals, and invalid input", () => {
  assert.equal(validateContribution(goal, [deposit], { ...deposit, amount: 60.1, kind: "withdrawal" }), null);
  assert.equal(validateContribution(goal, [deposit], { ...deposit, amount: 60.11, kind: "withdrawal" }), "goals.insufficientSavings");
  assert.equal(validateContribution({ ...goal, archivedAt: goal.updatedAt }, [], deposit), "goals.inactiveError");
  assert.equal(validateContribution({ ...goal, deletedAt: goal.updatedAt }, [], deposit), "goals.inactiveError");
  assert.equal(validateContribution(goal, [], { ...deposit, amount: 0 }), "goals.amountError");
  assert.equal(validateContribution(goal, [], { ...deposit, occurredOn: "2026-13-01" }), "goals.dateError");
  assert.equal(validateContribution(goal, [], { ...deposit, currency: "EUR" }), "goals.currencyError");
  assert.equal(validateContribution(goal, [], { ...deposit, note: "a".repeat(161) }), "goals.noteError");
});

test("old persisted data defaults to empty goals and cross-account rows are discarded", () => {
  assert.deepEqual(normalizeGoalData({}, "user"), { savingsGoals: [], goalContributions: [] });
  assert.deepEqual(normalizeGoalData({ savingsGoals: [goal, { ...goal, id: "other", userId: "other" }], goalContributions: [deposit, { ...deposit, id: "foreign", userId: "other" }, { ...deposit, id: "orphan", goalId: "missing" }] }, "user"), { savingsGoals: [goal], goalContributions: [deposit] });
});
