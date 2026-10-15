import assert from "node:assert/strict";
import test from "node:test";

import { extractHashtags, geminiBody, ParsedResponseError, validateParsedActions } from "../src/lib/spending-parser.ts";
import type { ParsedCaptureAction, ParsedCaptureItem } from "../src/lib/types.ts";

const context = {
  profileCurrency: "UZS",
  localDate: "2026-10-12",
  timeZone: "Asia/Tashkent",
  defaultPaymentMethodId: "cash-id",
  categories: [{ id: "food-id", name: "Food" }, { id: "other-id", name: "Other" }],
  paymentMethods: [{ id: "cash-id", name: "Cash" }, { id: "card-id", name: "Card" }],
  savingsGoals: [],
};

function item(overrides: Record<string, unknown> = {}) {
  return {
    amount: 7000,
    priceBasis: "per_item",
    currency: "UZS",
    description: "somsa",
    quantity: 4,
    date: null,
    category: "Food",
    paymentMethod: null,
    ...overrides,
  };
}

function expenseAction(actions: ParsedCaptureAction[], index = 0): ParsedCaptureItem {
  const action = actions[index];
  if (!action || action.type !== "expense") throw new Error("Expected a parsed expense.");
  return action;
}

test("calculates expense totals from per-item prices", () => {
  const parsed = expenseAction(validateParsedActions({ expenses: [item({ amount: 7, currency: "USD", description: "coffee", quantity: 2 })], incomes: [], goals: [], contributions: [] }, context, () => "expense-id"));
  assert.equal(parsed.amount, 14);
  assert.equal(parsed.quantity, 2);
  assert.equal(parsed.currency, "USD");
  assert.equal(parsed.description, "coffee");
});

test("rejects the complete response when any item has an invalid amount", () => {
  assert.throws(() => validateParsedActions({ expenses: [item(), item({ amount: -4, description: "tea" })], incomes: [], goals: [], contributions: [] }, context), ParsedResponseError);
});

test("uses profile currency and local date when the model returns null", () => {
  const parsed = expenseAction(validateParsedActions({ expenses: [item({ currency: null, date: null, quantity: null, priceBasis: "total" })], incomes: [], goals: [], contributions: [] }, context, () => "fallback-id"));
  assert.equal(parsed.currency, "UZS");
  assert.equal(parsed.spentAt, "2026-10-12T07:00:00.000Z");
  assert.equal(parsed.quantity, null);
});

test("applies an explicit date only to its expense and defaults the next item to today", () => {
  const parsed = validateParsedActions({ expenses: [
    item({ amount: 150000, description: "cinema ticket", quantity: null, date: "2026-10-10", priceBasis: "total" }),
    item({ amount: 120000, description: "burger king", quantity: null, date: null, priceBasis: "total" }),
  ], incomes: [], goals: [], contributions: [] }, context, (() => { let id = 0; return () => `expense-${++id}`; })());
  const cinema = expenseAction(parsed, 0);
  const burgerKing = expenseAction(parsed, 1);

  assert.equal(cinema.spentAt, "2026-10-10T07:00:00.000Z");
  assert.equal(burgerKing.spentAt, "2026-10-12T07:00:00.000Z");
});

test("maps an unknown category to Other and null payment to the default method", () => {
  const parsed = expenseAction(validateParsedActions({ expenses: [item({ category: "Unlisted category", paymentMethod: null })], incomes: [], goals: [], contributions: [] }, context, () => "fallback-id"));
  assert.equal(parsed.categoryId, "other-id");
  assert.equal(parsed.paymentMethodId, "cash-id");
});

test("maps an allowed payment method and category by name", () => {
  const parsed = expenseAction(validateParsedActions({ expenses: [item({ category: "fOoD", paymentMethod: "card" })], incomes: [], goals: [], contributions: [] }, context, () => "mapped-id"));
  assert.equal(parsed.categoryId, "food-id");
  assert.equal(parsed.paymentMethodId, "card-id");
});

test("rejects an empty result with a typed no-amount failure", () => {
  assert.throws(() => validateParsedActions({ expenses: [], incomes: [], goals: [], contributions: [] }, context), (error) => {
    assert.ok(error instanceof ParsedResponseError);
    assert.equal(error.code, "empty_result");
    return true;
  });
});

test("rejects invalid dates, currencies, methods, and item counts as whole responses", () => {
  assert.throws(() => validateParsedActions({ expenses: [item({ date: "2026-02-30" })], incomes: [], goals: [], contributions: [] }, context));
  assert.throws(() => validateParsedActions({ expenses: [item({ currency: "US" })], incomes: [], goals: [], contributions: [] }, context));
  assert.throws(() => validateParsedActions({ expenses: [item({ paymentMethod: "Someone else's card" })], incomes: [], goals: [], contributions: [] }, context));
  assert.throws(() => validateParsedActions({ expenses: Array.from({ length: 26 }, () => item()), incomes: [], goals: [], contributions: [] }, context));
});

test("extracts normalized hashtags once", () => {
  assert.deepEqual(extractHashtags("Taxi #Work, snacks #work and #Ташкент #Work"), ["work", "ташкент"]);
});

test("builds a Gemini structured-output request without adding hashtags as model fields", () => {
  const body = geminiBody("7000 somsa #food", context);
  const generationConfig = body.generationConfig as { responseMimeType: string; responseJsonSchema: Record<string, unknown> };
  const systemInstruction = body.systemInstruction as { parts: Array<{ text: string }> };
  const contents = body.contents as Array<{ parts: Array<{ text: string }> }>;
  const schema = generationConfig.responseJsonSchema;
  const userContent = JSON.parse(contents[0].parts[0].text) as Record<string, unknown>;

  assert.equal(generationConfig.responseMimeType, "application/json");
  assert.deepEqual(schema.required, ["expenses", "incomes", "goals", "contributions"]);
  assert.equal("hashtags" in (schema.properties as Record<string, unknown>), false);
  assert.equal(userContent.sourceText, "7000 somsa #food");
  assert.match(systemInstruction.parts[0].text, /priceBasis per_item/);
  assert.match(systemInstruction.parts[0].text, /April 2027 is 2027-04-30/);
  assert.match(systemInstruction.parts[0].text, /A date at the end of a line applies only to that line's expense/);
});
