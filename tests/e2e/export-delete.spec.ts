import { expect, test } from "playwright/test";

import { enterDemo, saveExpense } from "./helpers";

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
