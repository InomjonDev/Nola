import { expect, test } from "playwright/test";

test("auth callback presents provider errors without a login loop", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied&error_description=The%20provider%20denied%20access");
  await expect(page.getByRole("heading", { name: "Could not sign you in" })).toBeVisible();
  await expect(page.getByText("access_denied")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Walletly" })).toHaveAttribute("href", "/");
});
