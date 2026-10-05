import { expect, test } from "playwright/test";

import { oauthSession } from "./helpers";

test("Google callback exchanges the code once and preserves the session on reload", async ({ page, baseURL }) => {
  let exchanges = 0;
  const callback = new URL("/auth/callback?code=successful-oauth-code", baseURL);
  await page.route("**/auth/v1/authorize**", async (route) => {
    await route.fulfill({ status: 302, headers: { location: callback.href } });
  });
  await page.route("**/auth/v1/token**", async (route) => {
    exchanges += 1;
    expect(new URL(route.request().url()).searchParams.get("grant_type")).toBe("pkce");
    expect(route.request().postDataJSON()).toMatchObject({ auth_code: "successful-oauth-code", code_verifier: expect.any(String) });
    // A normal network delay lets the callback mount while the SDK exchange is pending.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(oauthSession()) });
  });
  await page.route("**/rest/v1/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("heading", { name: "Make it yours in one minute." })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(exchanges).toBe(1);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Make it yours in one minute." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Could not sign you in" })).toHaveCount(0);
  expect(exchanges).toBe(1);

  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: "Make it yours in one minute." })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(exchanges).toBe(1);
});

test("auth callback presents provider errors without a login loop", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied&error_description=The%20provider%20denied%20access");
  await expect(page.getByRole("heading", { name: "Could not sign you in" })).toBeVisible();
  await expect(page.getByText("This sign-in could not be completed. Go back to Walletly and try again in the same browser.")).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect(page.getByRole("link", { name: "Back to Walletly" })).toHaveAttribute("href", "/");
});

test("a callback opened without its browser verifier provides a recoverable error", async ({ page }) => {
  await page.goto("/auth/callback?code=code-from-another-browser");
  await expect(page.getByRole("heading", { name: "Could not sign you in" })).toBeVisible();
  await expect(page.getByText("This sign-in could not be completed. Go back to Walletly and try again in the same browser.")).toBeVisible();
  await expect(page.getByText(/PKCE|@supabase\/ssr/)).toHaveCount(0);
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await page.getByRole("link", { name: "Back to Walletly" }).click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("a callback without a code or session stays on the recovery screen", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: "Could not sign you in" })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
});
