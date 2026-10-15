import { expect, type Page } from "playwright/test";

export function oauthSession() {
  const now = Math.floor(Date.now() / 1000);
  const id = "11111111-1111-4111-8111-111111111111";
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ aud: "authenticated", exp: now + 3600, iat: now, role: "authenticated", sub: id })}.test-signature`,
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "test-refresh-token",
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      email: "oauth-test@example.com",
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: { full_name: "OAuth Test" },
      created_at: new Date().toISOString(),
    },
  };
}

export async function enterDemo(page: Page) {
  await page.goto("/");
  const demoButton = page.getByRole("button", { name: "Try local demo" });
  const enterButton = page.getByRole("button", { name: "Enter Nola" });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(demoButton.or(enterButton).or(navigation).first()).toBeVisible({ timeout: 15_000 });
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
    await expect(enterButton).toBeVisible({ timeout: 10_000 });
    await enterButton.click();
  } else if (await enterButton.isVisible().catch(() => false)) {
    await enterButton.click();
  }
  const analyticsDeclineButton = page.getByRole("button", { name: "Continue without analytics" });
  if (await analyticsDeclineButton.isVisible().catch(() => false)) await analyticsDeclineButton.click();
  await expect(navigation).toBeVisible({ timeout: 10_000 });
}

export async function saveExpense(page: Page, amount: string, note: string) {
  await page.locator(".workspace-compose-button").click();
  await page.getByRole("button", { name: "Add expense manually", exact: true }).click();
  await page.locator("#expense-amount").fill(amount);
  await page.locator("#expense-note").fill(note);
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
