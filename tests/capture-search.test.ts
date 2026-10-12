import assert from "node:assert/strict";
import test from "node:test";

import { searchSpendingRecords } from "../src/lib/capture-search.ts";
import type { Category, Expense, SpendingCapture, Tag } from "../src/lib/types.ts";

const userId = "20000000-0000-4000-8000-000000000001";
const lunchTagId = "30000000-0000-4000-8000-000000000001";

const captures: SpendingCapture[] = [
  {
    id: "capture-lunch",
    userId,
    sourceText: "7000 somsa 4x #lunch\n1500 tea",
    capturedAt: "2026-10-12T10:00:00.000Z",
    folderId: null,
    tagIds: [lunchTagId],
    parseStatus: "parsed",
    parseRevision: 1,
    parsedRevision: 1,
    parsedItems: null,
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:00.000Z",
  },
  {
    id: "capture-deleted",
    userId,
    sourceText: "deleted somsa",
    capturedAt: "2026-10-12T09:00:00.000Z",
    folderId: null,
    tagIds: [],
    parseStatus: "undone",
    parseRevision: 1,
    parsedRevision: null,
    parsedItems: null,
    deletedAt: "2026-10-12T09:01:00.000Z",
    updatedAt: "2026-10-12T09:01:00.000Z",
  },
];

const expenses: Expense[] = [
  {
    id: "expense-somsa",
    userId,
    amount: 7000,
    currency: "UZS",
    spentAt: "2026-10-12T09:55:00.000Z",
    categoryId: "food",
    paymentMethodId: "cash",
    captureId: "capture-lunch",
    quantity: 4,
    note: "Somsa",
    recurringRuleId: null,
    tagIds: [lunchTagId],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:00.000Z",
  },
  {
    id: "expense-tea",
    userId,
    amount: 1500,
    currency: "UZS",
    spentAt: "2026-10-12T09:57:00.000Z",
    categoryId: "food",
    paymentMethodId: "cash",
    captureId: "capture-lunch",
    quantity: null,
    note: "Tea",
    recurringRuleId: null,
    tagIds: [],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:00.000Z",
  },
  {
    id: "expense-legacy",
    userId,
    amount: 9000,
    currency: "UZS",
    spentAt: "2026-10-11T12:00:00.000Z",
    categoryId: "home",
    paymentMethodId: "cash",
    captureId: null,
    quantity: null,
    note: "Groceries",
    recurringRuleId: null,
    tagIds: [],
    deletedAt: null,
    updatedAt: "2026-10-11T12:00:00.000Z",
  },
  {
    id: "expense-deleted",
    userId,
    amount: 7000,
    currency: "UZS",
    spentAt: "2026-10-12T08:00:00.000Z",
    categoryId: "food",
    paymentMethodId: "cash",
    captureId: null,
    quantity: null,
    note: "Deleted somsa",
    recurringRuleId: null,
    tagIds: [],
    deletedAt: "2026-10-12T08:01:00.000Z",
    updatedAt: "2026-10-12T08:01:00.000Z",
  },
];

const categories: Category[] = [
  { id: "food", userId: null, name: "Food", color: "#f59e0b", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "home", userId: null, name: "Home", color: "#00a884", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
];

const tags: Tag[] = [
  { id: lunchTagId, userId, name: "lunch", updatedAt: "2026-10-12T10:00:00.000Z" },
];

function ids(query: string) {
  return searchSpendingRecords(query, captures, expenses, categories, tags).map((result) => result.key);
}

test("searches source text and linked expense descriptions", () => {
  assert.deepEqual(ids("somsa"), ["capture:capture-lunch", "expense:expense-somsa"]);
});

test("searches amounts with partial and localized number punctuation", () => {
  assert.deepEqual(ids("7000"), ["capture:capture-lunch", "expense:expense-somsa"]);
  assert.deepEqual(ids("70"), ["capture:capture-lunch", "expense:expense-somsa"]);
  assert.deepEqual(ids("7.000,00"), ["capture:capture-lunch", "expense:expense-somsa"]);
});

test("searches ISO dates and category labels across captures and expenses", () => {
  assert.deepEqual(ids("2026-10-12"), [
    "capture:capture-lunch",
    "expense:expense-tea",
    "expense:expense-somsa",
  ]);
  assert.deepEqual(ids("Food"), ["expense:expense-tea", "expense:expense-somsa"]);
});

test("searches hashtags in source text and tag names", () => {
  assert.deepEqual(ids("#lunch"), [
    "capture:capture-lunch",
    "expense:expense-somsa",
  ]);
});

test("includes active standalone legacy expenses and excludes deleted records", () => {
  assert.deepEqual(ids("Groceries"), ["expense:expense-legacy"]);
  assert.deepEqual(ids("deleted"), []);
});

test("returns stable identifiers, display dates, and highlight ranges", () => {
  const [result] = searchSpendingRecords("somsa", captures, expenses, categories, tags);
  assert.equal(result.key, "capture:capture-lunch");
  assert.equal(result.recordId, "capture-lunch");
  assert.equal(result.displayDate, "2026-10-12T10:00:00.000Z");
  assert.equal(result.matchField, "sourceText");
  assert.equal(result.matchText.slice(result.highlight.start, result.highlight.end).toLocaleLowerCase(), "somsa");
});
