import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("service worker push notifications route to add expense", () => {
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /add-expense/);
  assert.match(source, /addEventListener\("push"/);
  assert.match(source, /notificationclick/);
});
