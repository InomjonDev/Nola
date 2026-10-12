import { expect, test } from "playwright/test";

test("same-origin spending parse requests can surface a retryable no-amount response", async ({ page }) => {
  await page.goto("/");
  let interceptedPayload: unknown;
  await page.route("**/api/spending-captures/parse", async (route) => {
    interceptedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({ error: "empty_result", message: "No spending amount was found. Add an amount and try again." }),
    });
  });

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/spending-captures/parse", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer browser-session" },
      body: JSON.stringify({
        captureId: "11111111-1111-4111-8111-111111111111",
        parseRevision: 2,
        sourceText: "a nice afternoon",
        localDate: "2026-10-12",
        timeZone: "Asia/Tashkent",
      }),
    });
    return { status: response.status, body: await response.json() };
  });

  expect(interceptedPayload).toMatchObject({ sourceText: "a nice afternoon", parseRevision: 2 });
  expect(result.status).toBe(422);
  expect(result.body).toMatchObject({ error: "empty_result" });
});
