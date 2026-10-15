import { expect, test } from "playwright/test";

test("signed-out visitors must sign in and legacy demo sessions do not bypass auth", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("walletly.demo-session", JSON.stringify({ name: "Legacy" })));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try local demo" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("walletly.demo-session"))).toBeNull();
  await expect(page.getByLabel("Email address")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toHaveCount(0);
});
