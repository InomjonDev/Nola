import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAnalyticsUrl } from "../src/lib/analytics-url.ts";

test("analytics URLs remove query secrets and redact private record IDs", () => {
  assert.equal(
    sanitizeAnalyticsUrl("/captures/private-id?code=secret#fragment", "https://nolapp.vercel.app"),
    "https://nolapp.vercel.app/captures/[captureId]",
  );
  assert.equal(
    sanitizeAnalyticsUrl("/folders/private-id?token=secret", "https://nolapp.vercel.app"),
    "https://nolapp.vercel.app/folders/[folderId]",
  );
});
