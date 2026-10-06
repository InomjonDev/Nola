import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("service worker never caches cross-origin financial or authentication responses", () => {
  const handlers: Record<string, (event: { request: Request; respondWith: () => void }) => void> = {};
  runInNewContext(source, { URL, self: { location: { origin: "https://walletly.example" }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } } });
  for (const request of [new Request("https://project.supabase.co/rest/v1/savings_goals"), new Request("https://project.supabase.co/rest/v1/goal_contributions"), new Request("https://walletly.example/auth/callback?code=private"), new Request("https://walletly.example/api/private"), new Request("https://walletly.example/private", { headers: { authorization: "Bearer test" } })]) {
    let intercepted = false;
    handlers.fetch({ request, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, request.url);
  }
});

test("successful same-origin static assets are cached with a service worker lifetime", async () => {
  const handlers: Record<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void; waitUntil: (promise: Promise<void>) => void }) => void> = {};
  const stored: string[] = [];
  const pending: Promise<void>[] = [];
  runInNewContext(source, { URL, self: { location: { origin: "https://walletly.example" }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } }, fetch: async () => new Response("asset"), caches: { open: async () => ({ put: async (request: Request) => { stored.push(request.url); } }) } });
  let response: Promise<Response> | undefined;
  handlers.fetch({ request: new Request("https://walletly.example/_next/static/app.js"), respondWith: (value) => { response = value; }, waitUntil: (value) => { pending.push(value); } });
  assert.equal((await response)?.status, 200);
  await Promise.all(pending);
  assert.deepEqual(stored, ["https://walletly.example/_next/static/app.js"]);
});
