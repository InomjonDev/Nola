import assert from "node:assert/strict";
import test from "node:test";

import { consumeRollingWindow, formatShortCountdown, parseStoredDeadline, secondsUntil } from "../src/lib/action-rate-limit.ts";

test("deadline helpers reject malformed and expired persisted values", () => {
  assert.equal(parseStoredDeadline(null, 1_000), 0);
  assert.equal(parseStoredDeadline("not-a-number", 1_000), 0);
  assert.equal(parseStoredDeadline("999", 1_000), 0);
  assert.equal(parseStoredDeadline("61000", 1_000), 61_000);
});

test("secondsUntil rounds partial seconds up and stops at zero", () => {
  assert.equal(secondsUntil(61_001, 1_000), 61);
  assert.equal(secondsUntil(61_000, 1_000), 60);
  assert.equal(secondsUntil(999, 1_000), 0);
});

test("formatShortCountdown uses compact minute and second copy", () => {
  assert.equal(formatShortCountdown(0), "0:00");
  assert.equal(formatShortCountdown(9), "0:09");
  assert.equal(formatShortCountdown(60), "1:00");
  assert.equal(formatShortCountdown(125), "2:05");
});

test("rolling window records allowed events and reports retry time at the limit", () => {
  const first = consumeRollingWindow([], 10_000, 2, 60_000);
  assert.equal(first.allowed, true);
  assert.deepEqual(first.events, [10_000]);

  const second = consumeRollingWindow(first.events, 20_000, 2, 60_000);
  assert.equal(second.allowed, true);
  assert.deepEqual(second.events, [10_000, 20_000]);

  const blocked = consumeRollingWindow(second.events, 20_001, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 50);
  assert.deepEqual(blocked.events, [10_000, 20_000]);

  const recovered = consumeRollingWindow(blocked.events, 70_000, 2, 60_000);
  assert.equal(recovered.allowed, true);
  assert.deepEqual(recovered.events, [20_000, 70_000]);
});

test("rolling window validates policy arguments", () => {
  assert.throws(() => consumeRollingWindow([], 0, 0, 60_000));
  assert.throws(() => consumeRollingWindow([], 0, 1, 0));
});
