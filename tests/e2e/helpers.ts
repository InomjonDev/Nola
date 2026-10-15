import { expect, type Page } from "playwright/test";

export const E2E_USER_ID = "11111111-1111-4111-8111-111111111111";

export function oauthSession() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ aud: "authenticated", exp: now + 3600, iat: now, role: "authenticated", sub: E2E_USER_ID })}.test-signature`,
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "test-refresh-token",
    user: {
      id: E2E_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "oauth-test@example.com",
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: { full_name: "OAuth Test" },
      created_at: new Date().toISOString(),
    },
  };
}

export async function enterAuthenticatedApp(page: Page, currency = "USD") {
  await page.goto("/");
  const signInButton = page.getByRole("button", { name: "Continue with Google" });
  const enterButton = page.getByRole("button", { name: "Enter Nola" });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(signInButton.or(enterButton).or(navigation).first()).toBeVisible({ timeout: 15_000 });
  if (await signInButton.isVisible().catch(() => false)) {
    const callback = new URL("/auth/callback?code=e2e-account", page.url());
    await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 302, headers: { location: callback.href } }));
    await page.route("**/auth/v1/token**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(oauthSession()) }));
    await page.route("**/auth/v1/user**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(oauthSession().user) }));
    await page.route("**/auth/v1/logout**", (route) => route.fulfill({ status: 204 }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await signInButton.click();
  }

  await expect(enterButton.or(navigation).first()).toBeVisible({ timeout: 15_000 });
  if (await enterButton.isVisible().catch(() => false)) {
    if (currency !== "USD") await page.getByRole("button", { name: currency, exact: true }).click();
    await enterButton.click();
  }
  const analyticsDeclineButton = page.getByRole("button", { name: "Continue without analytics" });
  if (await analyticsDeclineButton.isVisible().catch(() => false)) await analyticsDeclineButton.click();
  await expect(navigation).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    return data.paymentMethods?.length > 0 && data.syncQueue?.length === 0;
  }, `walletly.app-data.v2-${E2E_USER_ID}`);
}

export async function saveExpense(page: Page, amount: string, note: string) {
  await page.locator(".workspace-compose-button").click();
  await page.getByRole("button", { name: "Add expense manually", exact: true }).click();
  await page.locator("#expense-amount").fill(amount);
  await page.locator("#expense-note").fill(note);
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
