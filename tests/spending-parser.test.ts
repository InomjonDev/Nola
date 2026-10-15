import assert from "node:assert/strict";
import test from "node:test";

import { extractHashtags, geminiBody, ParsedResponseError, validateParsedItems } from "../src/lib/spending-parser.ts";

const context = {
  profileCurrency: "UZS",
  localDate: "2026-10-12",
  timeZone: "Asia/Tashkent",
  defaultPaymentMethodId: "cash-id",
  categories: [{ id: "food-id", name: "Food" }, { id: "other-id", name: "Other" }],
  paymentMethods: [{ id: "cash-id", name: "Cash" }, { id: "card-id", name: "Card" }],
};

function item(overrides: Record<string, unknown> = {}) {
  return {
    amount: 7000,
    currency: "UZS",
    description: "somsa",
    quantity: 4,
    date: null,
    category: "Food",
    paymentMethod: null,
    ...overrides,
  };
}

test("keeps total amount separate from quantity", () => {
  const [parsed] = validateParsedItems({ items: [item()] }, context, () => "expense-id");
  assert.equal(parsed.amount, 7000);
  assert.equal(parsed.quantity, 4);
  assert.equal(parsed.currency, "UZS");
  assert.equal(parsed.description, "somsa");
});

test("rejects the complete response when any item has an invalid amount", () => {
  assert.throws(() => validateParsedItems({ items: [item(), item({ amount: -4, description: "tea" })] }, context), ParsedResponseError);
});

test("uses profile currency and local date when the model returns null", () => {
  const [parsed] = validateParsedItems({ items: [item({ currency: null, date: null, quantity: null })] }, context, () => "fallback-id");
  assert.equal(parsed.currency, "UZS");
  assert.equal(parsed.spentAt, "2026-10-12T07:00:00.000Z");
  assert.equal(parsed.quantity, null);
});

test("applies an explicit date only to its expense and defaults the next item to today", () => {
  const [cinema, burgerKing] = validateParsedItems({ items: [
    item({ amount: 150000, description: "cinema ticket", quantity: null, date: "2026-10-10" }),
    item({ amount: 120000, description: "burger king", quantity: null, date: null }),
  ] }, context, (() => { let id = 0; return () => `expense-${++id}`; })());

  assert.equal(cinema.spentAt, "2026-10-10T07:00:00.000Z");
  assert.equal(burgerKing.spentAt, "2026-10-12T07:00:00.000Z");
});

test("maps an unknown category to Other and null payment to the default method", () => {
  const [parsed] = validateParsedItems({ items: [item({ category: "Unlisted category", paymentMethod: null })] }, context, () => "fallback-id");
  assert.equal(parsed.categoryId, "other-id");
  assert.equal(parsed.paymentMethodId, "cash-id");
});

test("maps an allowed payment method and category by name", () => {
  const [parsed] = validateParsedItems({ items: [item({ category: "fOoD", paymentMethod: "card" })] }, context, () => "mapped-id");
  assert.equal(parsed.categoryId, "food-id");
  assert.equal(parsed.paymentMethodId, "card-id");
});

test("rejects an empty result with a typed no-amount failure", () => {
  assert.throws(() => validateParsedItems({ items: [] }, context), (error) => {
    assert.ok(error instanceof ParsedResponseError);
    assert.equal(error.code, "empty_result");
    return true;
  });
});

test("rejects invalid dates, currencies, methods, and item counts as whole responses", () => {
  assert.throws(() => validateParsedItems({ items: [item({ date: "2026-02-30" })] }, context));
  assert.throws(() => validateParsedItems({ items: [item({ currency: "US" })] }, context));
  assert.throws(() => validateParsedItems({ items: [item({ paymentMethod: "Someone else's card" })] }, context));
  assert.throws(() => validateParsedItems({ items: Array.from({ length: 26 }, () => item()) }, context));
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
  assert.deepEqual(schema.required, ["items"]);
  assert.equal("hashtags" in (schema.properties as Record<string, unknown>), false);
  assert.equal(userContent.sourceText, "7000 somsa #food");
  assert.match(systemInstruction.parts[0].text, /amount 7000 and quantity 4/);
  assert.match(systemInstruction.parts[0].text, /A date at the end of a line applies only to that line's expense/);
});
