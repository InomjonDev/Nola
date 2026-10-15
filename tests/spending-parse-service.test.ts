import assert from "node:assert/strict";
import test from "node:test";

import { createSpendingParseHandler } from "../src/lib/spending-parse-service.ts";
import type { ParseContext, ParseDependencies, ParseRequest } from "../src/lib/spending-parser.ts";
import type { ParsedCaptureItem, SpendingCapture } from "../src/lib/types.ts";

const captureId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const now = "2026-10-12T12:00:00.000Z";
const input: ParseRequest = {
  captureId,
  parseRevision: 1,
  sourceText: "7000 somsa 4x",
  localDate: "2026-10-12",
  timeZone: "Asia/Tashkent",
};
const context: ParseContext = {
  profileCurrency: "UZS",
  localDate: input.localDate,
  timeZone: input.timeZone,
  defaultPaymentMethodId: "cash-id",
  categories: [{ id: "food-id", name: "Food" }, { id: "other-id", name: "Other" }],
  paymentMethods: [{ id: "cash-id", name: "Cash" }],
};

function previousItem(): ParsedCaptureItem {
  return {
    id: "old-expense-id",
    amount: 5000,
    currency: "UZS",
    description: "Old somsa",
    quantity: null,
    spentAt: "2026-10-11T07:00:00.000Z",
    categoryId: "food-id",
    paymentMethodId: "cash-id",
    tagIds: [],
  };
}

function makeCapture(overrides: Partial<SpendingCapture> = {}): SpendingCapture {
  return {
    id: captureId,
    userId,
    sourceText: input.sourceText,
    capturedAt: now,
    folderId: null,
    tagIds: [],
    parseStatus: "pending",
    parseRevision: input.parseRevision,
    parsedRevision: null,
    parsedItems: null,
    deletedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

function geminiResponse(items: unknown) {
  return { candidates: [{ content: { parts: [
    { text: "internal thought", thought: true },
    { text: JSON.stringify({ items }) },
  ] } }] };
}

function makeDependencies(overrides: Partial<ParseDependencies> = {}, initialCapture: SpendingCapture | null = makeCapture()) {
  const saved = new Map<string, SpendingCapture>();
  if (initialCapture) saved.set(initialCapture.id, { ...initialCapture });
  let generatedId = 0;
  let quotaCalls = 0;
  let providerCalls = 0;
  const deps: ParseDependencies = {
    authenticate: async (token) => token === "valid-token" ? { userId } : null,
    readAiConsent: async () => true,
    readCapture: async (_owner, id) => saved.get(id) ?? null,
    updateCaptureIfCurrent: async (owner, expected, update) => {
      const current = saved.get(expected.id);
      if (!current || current.userId !== owner || current.deletedAt
        || current.parseRevision !== expected.parseRevision
        || current.sourceText !== expected.sourceText
        || current.parseStatus !== expected.parseStatus) return false;
      saved.set(expected.id, { ...current, ...update });
      return true;
    },
    readParseContext: async () => context,
    consumeQuota: async () => { quotaCalls += 1; return true; },
    requestGemini: async () => {
      providerCalls += 1;
      return geminiResponse([{ amount: 7000, currency: null, description: "somsa", quantity: 4, date: null, category: "Food", paymentMethod: null }]);
    },
    isGeminiConfigured: () => true,
    createId: () => `expense-${++generatedId}`,
    now: () => now,
    ...overrides,
  };
  return { deps, saved, counts: () => ({ quotaCalls, providerCalls }) };
}

function request(body: unknown = input, token = "valid-token") {
  return new Request("http://localhost/api/spending-captures/parse", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response) {
  return await response.json() as Record<string, unknown>;
}

test("parses and stores a capture with linked expense IDs", async () => {
  const { deps, saved, counts } = makeDependencies();
  const response = await createSpendingParseHandler(deps)(request());
  const body = await responseBody(response);
  const capture = saved.get(captureId);

  assert.equal(response.status, 200);
  assert.equal(body.captureId, captureId);
  assert.equal(body.parseRevision, 1);
  assert.deepEqual(body.items, capture?.parsedItems);
  assert.equal(capture?.parseStatus, "parsed");
  assert.equal(capture?.parsedRevision, 1);
  assert.equal(capture?.userId, userId);
  assert.equal((capture?.parsedItems?.[0])?.amount, 7000);
  assert.equal((capture?.parsedItems?.[0])?.quantity, 4);
  assert.deepEqual(counts(), { quotaCalls: 1, providerCalls: 1 });
});

test("returns 401 before reading owner data for an invalid session", async () => {
  let readCount = 0;
  const { deps } = makeDependencies({
    authenticate: async () => null,
    readAiConsent: async () => { readCount += 1; return true; },
  });
  const response = await createSpendingParseHandler(deps)(request());
  assert.equal(response.status, 401);
  assert.equal(readCount, 0);
});

test("rejects an invalid session before reading a malformed request body", async () => {
  const { deps } = makeDependencies();
  const malformed = new Request("http://localhost/api/spending-captures/parse", {
    method: "POST",
    headers: { authorization: "Bearer invalid-token", "content-type": "application/json" },
    body: "{not-json",
  });
  const response = await createSpendingParseHandler(deps)(malformed);
  assert.equal(response.status, 401);
  assert.equal((await responseBody(response)).error, "unauthenticated");
});

test("rejects an oversized request before reading consent or capture data", async () => {
  let consentReads = 0;
  const { deps } = makeDependencies({
    readAiConsent: async () => { consentReads += 1; return true; },
  });
  const oversized = request({ ...input, sourceText: "a".repeat(40_000) });
  const response = await createSpendingParseHandler(deps)(oversized);
  const body = await responseBody(response);
  assert.equal(response.status, 413);
  assert.equal(body.error, "text_too_long");
  assert.equal(body.message, "The spending request is too large.");
  assert.equal(consentReads, 0);
});

test("returns 401 when the bearer token is missing", async () => {
  const { deps } = makeDependencies();
  const response = await createSpendingParseHandler(deps)(request(input, ""));
  assert.equal(response.status, 401);
});

test("returns 403 when AI parsing consent is disabled", async () => {
  let captureReads = 0;
  const { deps } = makeDependencies({
    readAiConsent: async () => false,
    readCapture: async () => { captureReads += 1; return null; },
  });
  const response = await createSpendingParseHandler(deps)(request());
  assert.equal(response.status, 403);
  assert.equal(captureReads, 0);
});

test("returns 429 and retains retryable source text when the user quota is exhausted", async () => {
  const oldCapture = makeCapture({ parseStatus: "parsed", parsedRevision: 1, parsedItems: [previousItem()] });
  const { deps, saved, counts } = makeDependencies({
    consumeQuota: async () => false,
  }, oldCapture);
  const nextInput = { ...input, parseRevision: 2, sourceText: "8000 somsa 4x" };
  const response = await createSpendingParseHandler(deps)(request(nextInput));
  const capture = saved.get(captureId);

  assert.equal(response.status, 429);
  assert.equal(capture?.sourceText, nextInput.sourceText);
  assert.equal(capture?.parseRevision, 2);
  assert.equal(capture?.parseStatus, "needs_retry");
  assert.equal(capture?.parsedRevision, 1);
  assert.deepEqual(capture?.parsedItems, [previousItem()]);
  assert.deepEqual(counts(), { quotaCalls: 0, providerCalls: 0 });
});

test("marks a provider failure retryable without replacing the last validated result", async () => {
  const oldCapture = makeCapture({ parseStatus: "parsed", parsedRevision: 1, parsedItems: [previousItem()] });
  const { deps, saved } = makeDependencies({
    requestGemini: async () => { throw new Error("provider unavailable"); },
  }, oldCapture);
  const nextInput = { ...input, parseRevision: 2, sourceText: "8000 somsa 4x" };
  const response = await createSpendingParseHandler(deps)(request(nextInput));
  const capture = saved.get(captureId);

  assert.equal(response.status, 502);
  assert.equal(capture?.parseStatus, "needs_retry");
  assert.equal(capture?.parsedRevision, 1);
  assert.deepEqual(capture?.parsedItems, [previousItem()]);
});

test("rejects an invalid model result as a whole and keeps existing items", async () => {
  const oldCapture = makeCapture({ parseStatus: "parsed", parsedRevision: 1, parsedItems: [previousItem()] });
  const { deps, saved } = makeDependencies({
    requestGemini: async () => geminiResponse([
      { amount: 7000, currency: null, description: "somsa", quantity: 4, date: null, category: "Food", paymentMethod: null },
      { amount: -1, currency: null, description: "tea", quantity: null, date: null, category: "Food", paymentMethod: null },
    ]),
  }, oldCapture);
  const response = await createSpendingParseHandler(deps)(request({ ...input, parseRevision: 2 }));
  const capture = saved.get(captureId);

  assert.equal(response.status, 502);
  assert.equal(capture?.parseStatus, "needs_retry");
  assert.equal(capture?.parsedRevision, 1);
  assert.deepEqual(capture?.parsedItems, [previousItem()]);
});

test("returns a retryable no-amount response without discarding previous expenses", async () => {
  const oldCapture = makeCapture({ parseStatus: "parsed", parsedRevision: 1, parsedItems: [previousItem()] });
  const { deps, saved } = makeDependencies({
    requestGemini: async () => geminiResponse([]),
  }, oldCapture);
  const response = await createSpendingParseHandler(deps)(request({ ...input, parseRevision: 2, sourceText: "a nice afternoon" }));
  const body = await responseBody(response);
  const capture = saved.get(captureId);

  assert.equal(response.status, 422);
  assert.equal(body.error, "empty_result");
  assert.equal(capture?.sourceText, "a nice afternoon");
  assert.equal(capture?.parseStatus, "needs_retry");
  assert.equal(capture?.parsedRevision, 1);
  assert.deepEqual(capture?.parsedItems, [previousItem()]);
});

test("returns cached parsed items without another quota or provider request", async () => {
  const oldCapture = makeCapture({ parseStatus: "parsed", parsedRevision: 1, parsedItems: [previousItem()] });
  const { deps, counts } = makeDependencies({}, oldCapture);
  const response = await createSpendingParseHandler(deps)(request());
  const body = await responseBody(response);
  assert.equal(response.status, 200);
  assert.deepEqual(body.items, [previousItem()]);
  assert.deepEqual(counts(), { quotaCalls: 0, providerCalls: 0 });
});

test("rejects source-text mismatch and stale revisions with 409", async () => {
  const current = makeCapture({ parseStatus: "parsed", parsedRevision: 1, parsedItems: [previousItem()] });
  const { deps } = makeDependencies({}, current);
  const mismatch = await createSpendingParseHandler(deps)(request({ ...input, sourceText: "different text" }));
  const staleCurrent = makeCapture({ parseRevision: 2, sourceText: "newer text", parseStatus: "pending", parsedRevision: 1, parsedItems: [previousItem()] });
  const staleDeps = makeDependencies({}, staleCurrent).deps;
  const stale = await createSpendingParseHandler(staleDeps)(request(input));
  assert.equal(mismatch.status, 409);
  assert.equal(stale.status, 409);
});

test("rejects over-limit text before authentication or provider work", async () => {
  const { deps, counts } = makeDependencies();
  const response = await createSpendingParseHandler(deps)(request({ ...input, sourceText: "x".repeat(4001) }));
  assert.equal(response.status, 413);
  assert.deepEqual(counts(), { quotaCalls: 0, providerCalls: 0 });
});

test("returns 503 before consuming quota when Gemini configuration is missing", async () => {
  const { deps, saved, counts } = makeDependencies({ isGeminiConfigured: () => false });
  const response = await createSpendingParseHandler(deps)(request());
  assert.equal(response.status, 503);
  assert.equal(saved.get(captureId)?.parseStatus, "needs_retry");
  assert.deepEqual(counts(), { quotaCalls: 0, providerCalls: 0 });
});

test("returns capture_not_synced without creating a server row when local sync has not arrived", async () => {
  const { deps, saved, counts } = makeDependencies({}, null);
  const response = await createSpendingParseHandler(deps)(request());
  const body = await responseBody(response);
  assert.equal(response.status, 409);
  assert.equal(body.error, "capture_not_synced");
  assert.equal(saved.size, 0);
  assert.deepEqual(counts(), { quotaCalls: 0, providerCalls: 0 });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function waitFor<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

test("discards a delayed success when a newer revision is persisted", async () => {
  const provider = deferred<unknown>();
  const providerStarted = waitFor<void>();
  const { deps, saved } = makeDependencies({
    requestGemini: async () => {
      providerStarted.resolve();
      return await provider.promise;
    },
  });
  const pending = createSpendingParseHandler(deps)(request());
  await providerStarted.promise;

  const newerCapture = {
    ...saved.get(captureId)!,
    parseRevision: 2,
    sourceText: "9000 plov",
    parseStatus: "pending" as const,
    updatedAt: "2026-10-12T12:01:00.000Z",
  };
  saved.set(captureId, newerCapture);
  provider.resolve(geminiResponse([{ amount: 7000, currency: "UZS", description: "somsa", quantity: 4, date: null, category: "Food", paymentMethod: null }]));

  const response = await pending;
  assert.equal(response.status, 409);
  assert.deepEqual(saved.get(captureId), newerCapture);
});

test("does not mark a newer revision retryable after an older provider call fails", async () => {
  const provider = deferred<unknown>();
  const providerStarted = waitFor<void>();
  const { deps, saved } = makeDependencies({
    requestGemini: async () => {
      providerStarted.resolve();
      return await provider.promise;
    },
  });
  const pending = createSpendingParseHandler(deps)(request());
  await providerStarted.promise;

  const newerCapture = {
    ...saved.get(captureId)!,
    parseRevision: 2,
    sourceText: "9000 plov",
    parseStatus: "pending" as const,
    updatedAt: "2026-10-12T12:01:00.000Z",
  };
  saved.set(captureId, newerCapture);
  provider.reject(new Error("provider unavailable"));

  const response = await pending;
  assert.equal(response.status, 409);
  assert.deepEqual(saved.get(captureId), newerCapture);
});
