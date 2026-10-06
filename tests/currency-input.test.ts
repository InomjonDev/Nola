import assert from "node:assert/strict";
import test from "node:test";

import { formatAmountDraft, parseAmountValue } from "../src/lib/currency-input.ts";

test("groups typed digits", () => {
  assert.deepEqual(formatAmountDraft("1234", "en-US"), {
    canonical: "1234",
    display: "1,234",
    complete: true,
  });
});

test("preserves a trailing decimal", () => {
  assert.deepEqual(formatAmountDraft("12.", "en-US"), {
    canonical: "12.",
    display: "12.",
    complete: false,
  });
});

test("accepts a pasted currency symbol and grouped amount", () => {
  assert.deepEqual(formatAmountDraft("$1,234.50", "en-US"), {
    canonical: "1234.50",
    display: "1,234.50",
    complete: true,
  });
});

test("accepts spaces and a comma decimal", () => {
  const draft = formatAmountDraft("1 234,50", "ru-RU");
  assert.equal(draft.canonical, "1234.50");
  assert.equal(draft.complete, true);
  assert.equal(parseAmountValue(draft.canonical), 1234.5);
});

test("formats Uzbek Latin amounts consistently when runtime Intl data falls back by region", () => {
  assert.deepEqual(formatAmountDraft("1234567.89", "uz-Latn-UZ"), {
    canonical: "1234567.89",
    display: "1\u00a0234\u00a0567,89",
    complete: true,
  });
});

test("caps fractions at two digits", () => {
  assert.deepEqual(formatAmountDraft("12.345", "en-US"), {
    canonical: "12.34",
    display: "12.34",
    complete: true,
  });
});

test("caps the integer portion at twelve digits", () => {
  assert.equal(formatAmountDraft("1234567890123", "en-US").canonical, "123456789012");
});

test("supports deleting the complete draft", () => {
  assert.deepEqual(formatAmountDraft("", "en-US"), {
    canonical: "",
    display: "",
    complete: false,
  });
});

test("keeps a decimal-only draft incomplete", () => {
  assert.deepEqual(formatAmountDraft(",", "ru-RU"), {
    canonical: "0.",
    display: "0,",
    complete: false,
  });
  assert.equal(parseAmountValue("0."), null);
});

test("recognizes repeated grouping separators", () => {
  assert.equal(formatAmountDraft("1,234,567", "en-US").canonical, "1234567");
});

test("rejects invalid, zero, negative, incomplete, and overflowing values", () => {
  assert.equal(parseAmountValue(""), null);
  assert.equal(parseAmountValue("0"), null);
  assert.equal(parseAmountValue("-12"), null);
  assert.equal(parseAmountValue("12."), null);
  assert.equal(parseAmountValue("1000000000000"), null);
});

test("preserves a pasted negative sign but keeps the draft invalid", () => {
  assert.deepEqual(formatAmountDraft("-$12.50", "en-US"), {
    canonical: "-12.50",
    display: "-12.50",
    complete: false,
  });
  assert.equal(parseAmountValue("-12.50"), null);
});
