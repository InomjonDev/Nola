import { expect, test } from "playwright/test";
import { enterDemo } from "./helpers";

test("PWA metadata and service worker are available", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const serviceWorker = await page.request.get("/sw.js");
  expect(serviceWorker.ok()).toBeTruthy();
  await expect.poll(async () => page.evaluate(() => navigator.serviceWorker?.controller !== null || navigator.serviceWorker?.getRegistrations().then((items) => items.length > 0))).toBeTruthy();
});

test("demo reminder opt-in does not claim closed-app delivery is active", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Daily check-in" }).click();
  await expect(page.locator("p[role='alert']")).toContainText("signed-in account");
});
