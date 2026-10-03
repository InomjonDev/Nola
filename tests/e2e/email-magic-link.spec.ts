import { expect, test } from "playwright/test";

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function fakeSession(email: string) {
  const now = Math.floor(Date.now() / 1000);
  const id = "11111111-1111-4111-8111-111111111111";
  const accessToken = `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url({ aud: "authenticated", exp: now + 3600, iat: now, role: "authenticated", sub: id })}.c2lnbmF0dXJl`;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { email, email_verified: true },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  };
  return { access_token: accessToken, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "test-refresh-token", user };
}

test("email sign-in starts a refresh-persistent cooldown without storing the address", async ({ page }) => {
  let requests = 0;
  await page.route("**/auth/v1/otp**", async (route) => {
    requests += 1;
    const requestUrl = new URL(route.request().url());
    expect(new URL(requestUrl.searchParams.get("redirect_to") ?? "http://invalid").pathname).toBe("/auth/confirm");
    expect(route.request().postDataJSON()).toMatchObject({ email: "person@example.com", create_user: true });
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/");
  await page.getByLabel("Email address").fill(" Person@Example.com ");
  await page.getByRole("button", { name: "Send sign-in link" }).click();

  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText("We sent a secure sign-in link to person@example.com.")).toBeVisible();
  await expect(page.getByText("Open the link in the email to continue. It expires in 30 minutes.")).toBeVisible();
  await expect(page.getByLabel("Verification code")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Request another link in/ })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("walletly.auth.magicLinkNextAllowedAt"))).toMatch(/^\d+$/);
  expect(await page.evaluate(() => localStorage.getItem("walletly.auth.magicLinkEmail"))).toBeNull();

  await page.reload();
  await page.getByLabel("Email address").fill("another@example.com");
  await expect(page.getByRole("button", { name: /Request another link in/ })).toBeDisabled();
  expect(requests).toBe(1);
});

test("an expired device cooldown permits another email request", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("walletly.auth.magicLinkNextAllowedAt", String(Date.now() - 1));
  });
  await page.route("**/auth/v1/otp**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/");
  await page.getByLabel("Email address").fill("person@example.com");
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
});

test("project email throttling does not imply the recipient already requested a link", async ({ page }) => {
  await page.route("**/auth/v1/otp**", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ code: "over_email_send_rate_limit", msg: "Email rate limit exceeded" }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Email address").fill("first-request@example.com");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.locator("p[role='alert']")).toHaveText("Email sending is temporarily limited. Please try again later.");
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
});

test("network request throttling has distinct recovery copy", async ({ page }) => {
  await page.route("**/auth/v1/otp**", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ code: "over_request_rate_limit", msg: "Too many requests" }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Email address").fill("person@example.com");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.locator("p[role='alert']")).toHaveText("Too many sign-in attempts from this network. Try again in a few minutes.");
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
});

test("a token-hash email link creates a session in the receiving browser", async ({ page }) => {
  const email = "new-user@example.com";
  await page.route("**/auth/v1/verify**", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ token_hash: "valid-token-hash", type: "email" });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeSession(email)) });
  });
  await page.route("**/rest/v1/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/0" }, body: "[]" });
  });

  await page.goto("/auth/confirm?token_hash=valid-token-hash&type=email");

  await expect(page.getByRole("heading", { name: "Make it yours in one minute." })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("an invalid or expired email link returns to a recoverable state", async ({ page }) => {
  await page.route("**/auth/v1/verify**", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "otp_expired", msg: "Email link is invalid or has expired" }),
    });
  });

  await page.goto("/auth/confirm?token_hash=expired-token-hash&type=email");

  await expect(page.getByRole("heading", { name: "This link cannot be used" })).toBeVisible();
  await expect(page.getByText("The sign-in link is invalid or has expired. Request a new one from Walletly.")).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/confirm$/);
  await expect(page.getByRole("link", { name: "Back to Walletly" })).toBeVisible();
});
