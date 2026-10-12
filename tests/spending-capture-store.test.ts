import assert from "node:assert/strict";
import test from "node:test";

import { applyCaptureParseData, captureTotal, editCaptureTextData, filterOwnedTagIds, hasActiveFolderName, undoCaptureData } from "../src/lib/spending-captures.ts";
import type { Expense, SpendingCapture } from "../src/lib/types.ts";

const captureId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";

function capture(overrides: Partial<SpendingCapture> = {}): SpendingCapture {
  return {
    id: captureId,
    userId,
    sourceText: "7000 somsa 4x",
    capturedAt: "2026-10-12T10:00:00.000Z",
    folderId: null,
    tagIds: [],
    parseStatus: "parsed",
    parseRevision: 1,
    parsedRevision: 1,
    parsedItems: [],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:00.000Z",
    ...overrides,
  };
}

function expense(id: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id,
    userId,
    amount: 7000,
    currency: "UZS",
    spentAt: "2026-10-12T10:00:00.000Z",
    categoryId: "food",
    paymentMethodId: "cash",
    captureId,
    quantity: null,
    note: "Somsa",
    recurringRuleId: null,
    tagIds: [],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:00.000Z",
    ...overrides,
  };
}

test("capture total sums amounts once and ignores quantity", () => {
  const expenses = [
    expense("e1", { amount: 7000, quantity: 4 }),
    expense("e2", { amount: 1000, quantity: null }),
    expense("deleted", { amount: 999, deletedAt: "2026-10-12T10:01:00.000Z" }),
    expense("other-currency", { amount: 50, currency: "USD" }),
  ];
  assert.equal(captureTotal(expenses, captureId, "UZS"), 8000);
});

test("undoing a capture deletes its active linked expenses and leaves unrelated or already deleted rows alone", () => {
  const data = {
    spendingCaptures: [capture()],
    expenses: [
      expense("e1"),
      expense("e2"),
      expense("legacy", { captureId: null }),
      expense("old", { deletedAt: "2026-10-11T10:00:00.000Z" }),
    ],
  };
  const deletedAt = "2026-10-12T10:00:00.000Z";
  const next = undoCaptureData(data, captureId, deletedAt);
  assert.equal(next.spendingCaptures[0].deletedAt, deletedAt);
  assert.equal(next.spendingCaptures[0].parseStatus, "undone");
  assert.deepEqual(next.expenses.map((item) => item.deletedAt), [deletedAt, deletedAt, null, "2026-10-11T10:00:00.000Z"]);
  assert.equal(undoCaptureData(data, "missing", deletedAt), data);
});

test("source edits advance the parse revision and retain old expenses until replacement succeeds", () => {
  const data = { spendingCaptures: [capture()], expenses: [expense("e1", { quantity: 4 })] };
  const edited = editCaptureTextData(data, captureId, "7000 somsa 4x #lunch\n1500 choy", "2026-10-12T10:01:00.000Z");
  assert.equal(edited.spendingCaptures[0].sourceText, "7000 somsa 4x #lunch\n1500 choy");
  assert.equal(edited.spendingCaptures[0].parseRevision, 2);
  assert.equal(edited.spendingCaptures[0].parseStatus, "pending");
  assert.equal(edited.expenses[0].deletedAt, null);
});

test("a current complete parse replaces linked expenses atomically and rejects stale, invalid, or undone results", () => {
  const oldExpense = expense("old-expense", { quantity: 4 });
  const data = { spendingCaptures: [capture({ parseRevision: 2, parseStatus: "pending" })], expenses: [oldExpense, expense("legacy", { captureId: null })] };
  const item = { id: "new-expense", amount: 8500, currency: "UZS", description: "somsa and tea", quantity: null, spentAt: "2026-10-12T00:00:00.000Z", categoryId: "food", paymentMethodId: "cash", tagIds: [] };
  const replaced = applyCaptureParseData(data, captureId, 2, [item], "2026-10-12T10:02:00.000Z");

  assert.equal(replaced.spendingCaptures[0].parseStatus, "parsed");
  assert.equal(replaced.spendingCaptures[0].parsedRevision, 2);
  assert.equal(replaced.expenses.find((expense) => expense.id === oldExpense.id)?.deletedAt, "2026-10-12T10:02:00.000Z");
  assert.equal(replaced.expenses.find((expense) => expense.id === "new-expense")?.captureId, captureId);
  assert.equal(replaced.expenses.find((expense) => expense.id === "legacy")?.deletedAt, null);
  assert.equal(applyCaptureParseData(data, captureId, 1, [item]), data);
  assert.equal(applyCaptureParseData(replaced, captureId, 2, [item]), replaced);
  assert.equal(applyCaptureParseData(data, captureId, 2, [{ ...item, amount: 0 }]), data);

  const undone = undoCaptureData(data, captureId, "2026-10-12T10:03:00.000Z");
  assert.equal(applyCaptureParseData(undone, captureId, 2, [item]), undone);
});

test("an empty parse result leaves existing linked expenses active", () => {
  const data = {
    spendingCaptures: [capture({ parseRevision: 2, parseStatus: "pending" })],
    expenses: [expense("existing-expense", { quantity: 4 })],
  };
  const result = applyCaptureParseData(data, captureId, 2, [], "2026-10-12T10:04:00.000Z");
  assert.equal(result, data);
  assert.equal(result.expenses[0].deletedAt, null);
});

test("parse replacement applies only client-owned capture tags", () => {
  const tagId = "30000000-0000-4000-8000-000000000001";
  const tagged = { spendingCaptures: [capture({ tagIds: [tagId], parseStatus: "pending", parsedRevision: null })], expenses: [] as Expense[] };
  const item = { id: "tagged-expense", amount: 7000, currency: "UZS", description: "somsa", quantity: 4, spentAt: "2026-10-12T00:00:00.000Z", categoryId: "food", paymentMethodId: "cash", tagIds: ["model-invented"] };
  const result = applyCaptureParseData(tagged, captureId, 1, [item]);
  assert.deepEqual(result.spendingCaptures[0].parsedItems?.[0].tagIds, [tagId]);
  assert.deepEqual(result.expenses[0].tagIds, [tagId]);
  assert.deepEqual(filterOwnedTagIds([tagId, "other-user-tag", tagId], [{ id: tagId, userId }, { id: "other-user-tag", userId: "another-user" }], userId), [tagId]);
});

test("active folder names are unique case-insensitively per user", () => {
  const folders = [
    { id: "folder-1", userId, name: "Food", color: "#ffffff", deletedAt: null, updatedAt: "2026-10-12T10:00:00.000Z" },
    { id: "folder-deleted", userId, name: "Old", color: "#ffffff", deletedAt: "2026-10-12T10:00:00.000Z", updatedAt: "2026-10-12T10:00:00.000Z" },
    { id: "folder-other-user", userId: "another-user", name: "Travel", color: "#ffffff", deletedAt: null, updatedAt: "2026-10-12T10:00:00.000Z" },
  ];
  assert.equal(hasActiveFolderName(folders, " food ", userId), true);
  assert.equal(hasActiveFolderName(folders, "food", userId, "folder-1"), false);
  assert.equal(hasActiveFolderName(folders, "Old", userId), false);
  assert.equal(hasActiveFolderName(folders, "Travel", userId), false);
});
