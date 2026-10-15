import assert from "node:assert/strict";
import test from "node:test";

import { parseNetworkFingerprint } from "../src/lib/parse-network-fingerprint.ts";

function request(ip?: string) {
  return new Request("https://nolapp.vercel.app/api/spending-captures/parse", {
    headers: ip ? { "x-forwarded-for": ip } : {},
  });
}

test("uses a stable private fingerprint for a trusted client address", () => {
  const first = parseNetworkFingerprint(request("203.0.113.10"), "server-secret", true);
  const repeat = parseNetworkFingerprint(request("203.0.113.10"), "server-secret", true);
  const other = parseNetworkFingerprint(request("203.0.113.11"), "server-secret", true);
  assert.match(first ?? "", /^[0-9a-f]{64}$/);
  assert.equal(first, repeat);
  assert.notEqual(first, other);
  assert.ok(!first?.includes("203.0.113.10"));
});

test("fails closed when Vercel has no valid client address", () => {
  assert.equal(parseNetworkFingerprint(request(), "server-secret", true), null);
  assert.equal(parseNetworkFingerprint(request("not-an-ip"), "server-secret", true), null);
  assert.equal(parseNetworkFingerprint(request("203.0.113.10"), "", true), null);
});

test("uses a stable local fingerprint outside Vercel", () => {
  assert.equal(parseNetworkFingerprint(request(), "server-secret", false), parseNetworkFingerprint(request("127.0.0.1"), "server-secret", false));
});
