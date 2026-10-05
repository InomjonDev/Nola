import { expect, test } from "playwright/test";

import { enterDemo, oauthSession, saveExpense } from "./helpers";

for (const { deletionSucceeds, cleanupFails } of [{ deletionSucceeds: true, cleanupFails: false }, { deletionSucceeds: true, cleanupFails: true }, { deletionSucceeds: false, cleanupFails: false }]) {
  test(`cloud deletion ${deletionSucceeds ? `clears the session without writing deleted reminder preferences${cleanupFails ? " even if cleanup services fail" : ""}` : "preserves the session and data on failure"}`, async ({ page, baseURL }) => {
    const session = oauthSession();
    const callback = new URL("/auth/callback?code=deletion-test", baseURL);
    let deletionRequests = 0;
    let reminderWrites = 0;
    await page.addInitScript((fails) => {
      const registration = { pushManager: { getSubscription: async () => fails ? { unsubscribe: async () => { throw new Error("Push unavailable"); } } : null } };
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
      Object.defineProperty(navigator.serviceWorker, "getRegistration", { value: async () => registration });
    }, cleanupFails);
    await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 302, headers: { location: callback.href } }));
    await page.route("**/auth/v1/token**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
    await page.route("**/auth/v1/logout**", (route) => route.fulfill({ status: cleanupFails ? 500 : 401, contentType: "application/json", body: JSON.stringify({ message: "User no longer exists" }) }));
    await page.route("**/rest/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/rpc/delete_own_account")) {
        deletionRequests += 1;
        await route.fulfill({ status: deletionSucceeds ? 204 : 500, contentType: "application/json", body: deletionSucceeds ? "" : JSON.stringify({ code: "XX000", message: "Database deletion failed" }) });
      } else if (path.endsWith("/reminder_preferences") && route.request().method() === "POST") {
        reminderWrites += 1;
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "23503", message: "User no longer exists" }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.getByRole("button", { name: "Enter Walletly" }).click();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your Walletly account?" });
    await dialog.getByRole("button", { name: "Delete permanently" }).click();
    if (deletionSucceeds) {
      await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
      const remainingKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.endsWith("-auth-token") || key.includes("11111111-1111-4111-8111-111111111111")));
      expect(remainingKeys).toEqual([]);
      await page.reload();
      await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    } else {
      await expect(dialog.getByRole("alert")).toContainText("Walletly could not delete your account");
      const retained = await page.evaluate(() => Object.keys(localStorage).some((key) => key.endsWith("-auth-token")));
      expect(retained).toBe(true);
      const retainedData = await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("walletly.app-data") && key.includes("11111111-1111-4111-8111-111111111111")));
      expect(retainedData).toBe(true);
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(page.getByRole("button", { name: "Delete account" })).toBeVisible();
    }
    expect(deletionRequests).toBe(1);
    expect(reminderWrites).toBe(0);
  });
}

test("settings exports JSON and account deletion returns to auth", async ({ page }) => {
  await enterDemo(page);
  await saveExpense(page, "4.00", "Export check");
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("walletly-export.json");
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your Walletly account?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("button", { name: "Try local demo" })).toBeVisible();
});

test("settings limits repeated export generation", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/settings");

  for (let index = 0; index < 5; index += 1) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    await downloadPromise;
  }

  await page.getByRole("button", { name: "Export JSON" }).click();
  await expect(page.locator("p[role='alert']")).toContainText("Too many exports. Try again in");
});
