import { expect, test } from "playwright/test";

test("PWA metadata and service worker are available", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const serviceWorker = await page.request.get("/sw.js");
  expect(serviceWorker.ok()).toBeTruthy();
  await expect.poll(async () => page.evaluate(() => navigator.serviceWorker?.controller !== null || navigator.serviceWorker?.getRegistrations().then((items) => items.length > 0))).toBeTruthy();
});
