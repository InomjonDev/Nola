import { expect, test } from "playwright/test";

test("email sign-in stays hidden until a verified sender is configured", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try local demo" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toHaveCount(0);
});
