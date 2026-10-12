import assert from "node:assert/strict";
import test from "node:test";

import { expenseRow, spendingCaptureRow, spendingFolderRow, toExpense, toProfile, toSpendingCapture, toSpendingFolder } from "../src/lib/mappers.ts";

test("maps a parsed spending capture without losing source text or parse results", () => {
  const capture = {
    id: "10000000-0000-4000-8000-000000000001",
    userId: "20000000-0000-4000-8000-000000000001",
    sourceText: "7000 somsa 4x #lunch",
    capturedAt: "2026-10-12T10:00:00.000Z",
    folderId: null,
    tagIds: ["30000000-0000-4000-8000-000000000001"],
    parseStatus: "parsed" as const,
    parseRevision: 1,
    parsedRevision: 1,
    parsedItems: [{
      id: "40000000-0000-4000-8000-000000000001",
      amount: 7000,
      currency: "UZS",
      description: "Somsa",
      quantity: 4,
      spentAt: "2026-10-12T10:00:00.000Z",
      categoryId: "00000000-0000-4000-8000-000000000001",
      paymentMethodId: "30000000-0000-4000-8000-000000000002",
      tagIds: ["30000000-0000-4000-8000-000000000001"],
    }],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:02.000Z",
  };
  const row = spendingCaptureRow(capture);
  assert.equal(row.source_text, capture.sourceText);
  assert.equal(toSpendingCapture(row).sourceText, capture.sourceText);
  assert.equal(toSpendingCapture(row).parseStatus, "parsed");
  assert.equal(toSpendingCapture(row).parseRevision, 1);
  assert.deepEqual(toSpendingCapture(row).parsedItems, capture.parsedItems);
});

test("maps nullable folder links and folder tombstones", () => {
  const folder = {
    id: "10000000-0000-4000-8000-000000000002",
    userId: "20000000-0000-4000-8000-000000000001",
    name: "Lunch",
    color: "#E2B744",
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:00.000Z",
  };
  const row = spendingFolderRow(folder);
  assert.deepEqual(toSpendingFolder(row), folder);
  assert.equal(toSpendingCapture({
    id: "10000000-0000-4000-8000-000000000003",
    user_id: folder.userId,
    source_text: "Lunch",
    captured_at: "2026-10-12T10:00:00.000Z",
    folder_id: null,
    tag_ids: null,
    parse_status: "pending",
    parse_revision: 1,
    parsed_revision: null,
    parsed_items: null,
    deleted_at: null,
    client_updated_at: "2026-10-12T10:00:00.000Z",
  }).folderId, null);
});

test("maps expense capture links and quantities without multiplying amounts", () => {
  const expense = {
    id: "10000000-0000-4000-8000-000000000004",
    userId: "20000000-0000-4000-8000-000000000001",
    amount: 7000,
    currency: "UZS",
    spentAt: "2026-10-12T10:00:00.000Z",
    categoryId: "00000000-0000-4000-8000-000000000001",
    paymentMethodId: "30000000-0000-4000-8000-000000000002",
    captureId: "10000000-0000-4000-8000-000000000001",
    quantity: 4,
    note: "Somsa",
    recurringRuleId: null,
    tagIds: [],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:02.000Z",
  };
  const row = expenseRow(expense);
  assert.equal(row.amount, 7000);
  assert.equal(row.capture_id, expense.captureId);
  assert.equal(row.quantity, 4);
  assert.deepEqual(toExpense(row), expense);
  assert.equal(toExpense({ ...row, capture_id: null, quantity: null }).quantity, null);
});

test("defaults AI parsing consent to disabled for profiles without the new column", () => {
  const profile = toProfile({
    id: "20000000-0000-4000-8000-000000000001",
    currency: "UZS",
    default_payment_method_id: "30000000-0000-4000-8000-000000000002",
    onboarding_completed: true,
  });
  assert.equal(profile.aiParsingEnabled, false);
});
