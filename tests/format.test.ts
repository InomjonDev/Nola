import assert from "node:assert/strict";
import test from "node:test";

import { expensesInCurrency, isThisWeek, primaryCurrency } from "../src/lib/format.ts";

const expense = (currency: string) => ({ currency }) as Parameters<typeof primaryCurrency>[0][number];

test("keeps the profile currency when it is present in the period", () => {
  assert.equal(primaryCurrency([expense("UZS"), expense("USD")], "USD"), "USD");
});

test("uses the period currency when the profile currency has no expenses", () => {
  assert.equal(primaryCurrency([expense("UZS")], "USD"), "UZS");
});

test("never combines amounts from different currencies", () => {
  const expenses = [expense("USD"), expense("RUB"), expense("USD")];
  assert.equal(expensesInCurrency(expenses, "USD").length, 2);
});

test("treats the full current day as part of this week", () => {
  const laterToday = new Date();
  laterToday.setHours(23, 0, 0, 0);
  assert.equal(isThisWeek(laterToday.toISOString()), true);
});
