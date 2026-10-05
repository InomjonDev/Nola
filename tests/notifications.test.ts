import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("service worker push notifications route to add expense", () => {
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /add-expense/);
  assert.match(source, /addEventListener\("push"/);
  assert.match(source, /notificationclick/);
});

test("scheduled reminders are deduplicated by local delivery date", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261003181024_reminder_delivery_idempotency.sql", import.meta.url), "utf8");
  const functionSource = readFileSync(new URL("../supabase/functions/daily-reminders/index.ts", import.meta.url), "utf8");
  assert.match(migration, /last_notified_on date/);
  assert.match(functionSource, /last_notified_on\.is\.null,last_notified_on\.neq/);
  assert.match(functionSource, /if \(preference\.last_notified_on === reminderDate\) return false/);
});

test("enabling reminders requires a signed-in account and configured Web Push", () => {
  const source = readFileSync(new URL("../src/lib/notifications.ts", import.meta.url), "utf8");
  assert.match(source, /!userId \|\| !supabase \|\| !isSupported\(\) \|\| !process\.env\.NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
  assert.doesNotMatch(source, /showNotification\(title/);
});
