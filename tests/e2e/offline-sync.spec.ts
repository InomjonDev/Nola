import { expect, test } from "playwright/test";

import { enterDemo, saveExpense } from "./helpers";

test("local expense mutations survive offline reload", async ({ context, page }) => {
  await enterDemo(page);
  await context.setOffline(true);
  await saveExpense(page, "7.25", "Offline coffee");
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("Offline coffee")).toBeVisible();
});
