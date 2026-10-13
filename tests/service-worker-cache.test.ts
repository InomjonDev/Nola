import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("service worker precaches the fonts required for offline PDF export", async () => {
  const handlers: Record<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void> = {};
  const pending: Promise<unknown>[] = [];
  let shellPaths: string[] = [];
  runInNewContext(source, {
    self: {
      addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; },
      skipWaiting: async () => undefined,
    },
    caches: {
      open: async () => ({ addAll: async (paths: string[]) => { shellPaths = paths; } }),
    },
  });

  handlers.install({ waitUntil: (promise) => { pending.push(promise); } });
  await Promise.all(pending);
  assert.ok(shellPaths.includes("/fonts/NotoSans-Regular.ttf"));
  assert.ok(shellPaths.includes("/fonts/NotoSans-Bold.ttf"));
});

test("service worker never caches cross-origin financial, authentication, API, or private capture/folder responses", () => {
  const handlers: Record<string, (event: { request: Request; respondWith: () => void }) => void> = {};
  runInNewContext(source, { URL, self: { location: { origin: "https://nola.example" }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } } });
  for (const request of [
    new Request("https://project.supabase.co/rest/v1/savings_goals"),
    new Request("https://project.supabase.co/rest/v1/goal_contributions"),
    new Request("https://nola.example/auth/callback?code=private"),
    new Request("https://nola.example/api/private"),
    new Request("https://nola.example/api/spending-captures/parse?private=true"),
    new Request("https://nola.example/api/spending-folders"),
    new Request("https://nola.example/folders"),
    new Request("https://nola.example/captures/private-capture-id"),
    new Request("https://nola.example/folders/private-folder-id"),
    new Request("https://nola.example/private", { headers: { authorization: "Bearer test" } }),
  ]) {
    let intercepted = false;
    handlers.fetch({ request, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, request.url);
  }
});

test("successful same-origin static assets are cached with a service worker lifetime", async () => {
  const handlers: Record<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void; waitUntil: (promise: Promise<void>) => void }) => void> = {};
  const stored: string[] = [];
  const pending: Promise<void>[] = [];
  runInNewContext(source, { URL, self: { location: { origin: "https://nola.example" }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } }, fetch: async () => new Response("asset"), caches: { open: async () => ({ put: async (request: Request) => { stored.push(request.url); } }) } });
  let response: Promise<Response> | undefined;
  handlers.fetch({ request: new Request("https://nola.example/_next/static/app.js"), respondWith: (value) => { response = value; }, waitUntil: (value) => { pending.push(value); } });
  assert.equal((await response)?.status, 200);
  await Promise.all(pending);
  assert.deepEqual(stored, ["https://nola.example/_next/static/app.js"]);
});
