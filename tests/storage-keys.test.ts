import assert from "node:assert/strict";
import test from "node:test";

import { appStorageKey } from "../src/lib/constants.ts";

test("native account storage keys use SecureStore-safe characters", () => {
  const key = appStorageKey("10000000-0000-4000-8000-000000000001");
  assert.match(key, /^[A-Za-z0-9._-]+$/);
  assert.doesNotMatch(key, /:/);
});
