import { expect, test, type Page } from "playwright/test";

import { oauthSession } from "./helpers";

const userId = "11111111-1111-4111-8111-111111111111";
const appDataKey = `walletly.app-data.v2-${userId}`;

async function enterAuthenticatedApp(page: Page, baseURL: string) {
  const callback = new URL("/auth/callback?code=capture-test", baseURL);
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 302, headers: { location: callback.href } }));
  await page.route("**/auth/v1/token**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(oauthSession()) }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));

  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("heading", { name: "Set up your wallet" })).toBeVisible();
  await page.getByRole("button", { name: "UZS", exact: true }).click();
  await page.getByRole("button", { name: "Enter Nola" }).click();
  const cookieAccept = page.getByRole("button", { name: "Accept", exact: true });
  if (await cookieAccept.isVisible().catch(() => false)) await cookieAccept.click();
  await expect(page.locator(".workspace-compose-button")).toBeVisible();
  await page.waitForFunction((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    return data.paymentMethods?.length > 0 && data.syncQueue?.length === 0;
  }, appDataKey);
}

async function enterLocalDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try local demo" }).click();
  await page.getByRole("button", { name: "Enter Nola" }).click();
  const cookieAccept = page.getByRole("button", { name: "Accept", exact: true });
  if (await cookieAccept.isVisible().catch(() => false)) await cookieAccept.click();
  await expect(page.locator(".workspace-compose-button")).toBeVisible();
}

async function openComposer(page: Page, sourceText: string) {
  await page.locator(".workspace-compose-button").click();
  await page.getByRole("textbox", { name: "Spending note" }).fill(sourceText);
  await page.getByRole("button", { name: "Save note", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Allow AI parsing?", level: 3 })).toBeVisible();
}

async function completeOneParse(routeBody: { captureId: string; parseRevision: number }, paymentMethodId: string) {
  return {
    captureId: routeBody.captureId,
    parseRevision: routeBody.parseRevision,
    items: [{
      id: "33333333-3333-4333-8333-333333333333",
      amount: 7000,
      currency: "UZS",
      description: "somsa",
      quantity: 4,
      spentAt: "2026-10-13T12:00:00.000Z",
      categoryId: "00000000-0000-4000-8000-000000000001",
      paymentMethodId,
      tagIds: [],
    }],
  };
}

test("Not now keeps the source text in the composer and sends no parse request", async ({ page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  let parseRequests = 0;
  await page.route("**/api/spending-captures/parse", async (route) => {
    parseRequests += 1;
    await route.fulfill({ status: 200, json: {} });
  });

  await openComposer(page, "7000 somsa 4x");
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Spending note" })).toHaveValue("7000 somsa 4x");
  expect(parseRequests).toBe(0);
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), appDataKey);
  expect(state.spendingCaptures ?? []).toHaveLength(0);
});

test("the demo cannot opt into AI, and sign-in keeps the typed draft", async ({ page, baseURL }) => {
  const callback = new URL("/auth/callback?code=demo-capture-test", baseURL!);
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 302, headers: { location: callback.href } }));
  await page.route("**/auth/v1/token**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(oauthSession()) }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  let parseRequests = 0;
  await page.route("**/api/spending-captures/parse", async (route) => {
    parseRequests += 1;
    await route.fulfill({ status: 200, json: {} });
  });
  await enterLocalDemo(page);

  await page.locator(".workspace-compose-button").click();
  await page.getByRole("textbox", { name: "Spending note" }).fill("7000 somsa 4x");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.getByRole("heading", { name: "AI parsing needs an account", level: 3 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign in to parse", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("heading", { name: "Set up your wallet" })).toBeVisible();
  await page.getByRole("button", { name: "UZS", exact: true }).click();
  await page.getByRole("button", { name: "Enter Nola" }).click();
  const cookieAccept = page.getByRole("button", { name: "Accept", exact: true });
  if (await cookieAccept.isVisible().catch(() => false)) await cookieAccept.click();
  await expect(page.getByRole("textbox", { name: "Spending note" })).toHaveValue("7000 somsa 4x");
  expect(parseRequests).toBe(0);
});

test("switching to manual entry preserves the note and returns it on cancel", async ({ page }) => {
  await enterLocalDemo(page);
  await page.locator(".workspace-compose-button").click();
  await page.getByRole("textbox", { name: "Spending note" }).fill("7000 somsa 4x");
  await page.getByRole("button", { name: "Add expense manually", exact: true }).click();
  const manualDialog = page.getByRole("dialog", { name: "Add expense", exact: true });
  await expect(manualDialog.locator("#expense-note")).toHaveValue("7000 somsa 4x");
  await manualDialog.getByRole("button", { name: "Close add expense", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Spending note" })).toHaveValue("7000 somsa 4x");
});

test("an offline note stays pending locally until the device reconnects", async ({ context, page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  await context.setOffline(true);
  await page.waitForFunction(() => !navigator.onLine);
  let parseRequests = 0;
  await page.route("**/api/spending-captures/parse", async (route) => {
    parseRequests += 1;
    await route.fulfill({ status: 200, json: {} });
  });

  await openComposer(page, "7000 somsa 4x");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Saved on this device. It will be parsed when you’re online.", { exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    return data.spendingCaptures?.[0]?.parseStatus;
  }, appDataKey)).toBe("pending");
  expect(parseRequests).toBe(0);
});

test("7000 somsa 4x parses as 7,000 UZS with quantity four and group Undo", async ({ page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  const paymentMethodId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").paymentMethods[0].id, appDataKey);
  let parseRequests = 0;
  await page.route("**/api/spending-captures/parse", async (route) => {
    parseRequests += 1;
    const body = route.request().postDataJSON() as { captureId: string; parseRevision: number; sourceText: string; localDate: string; timeZone: string };
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(body).toMatchObject({ sourceText: "7000 somsa 4x", parseRevision: 1 });
    expect(body.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await route.fulfill({ status: 200, json: await completeOneParse(body, paymentMethodId) });
  });

  await openComposer(page, "7000 somsa 4x");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Spending note: 7000 somsa 4x" })).toBeVisible();
  await expect(page.getByText("1 expenses added", { exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const expense = data.expenses?.find((item: { captureId: string }) => item.captureId);
    return expense ? [expense.amount, expense.currency, expense.quantity] : null;
  }, appDataKey)).toEqual([7000, "UZS", 4]);
  expect(parseRequests).toBe(1);

  await page.locator("aside[aria-live='polite']").getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".workspace-compose-button")).toBeFocused();
  await expect.poll(async () => page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const capture = data.spendingCaptures?.[0];
    const expense = data.expenses?.find((item: { captureId: string }) => item.captureId);
    return [Boolean(capture?.deletedAt), Boolean(expense?.deletedAt)];
  }, appDataKey)).toEqual([true, true]);
});

test("reload replays cached parse results without duplicating or restoring a deleted linked expense", async ({ page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  const paymentMethodId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").paymentMethods[0].id, appDataKey);
  let parseRequests = 0;
  await page.route("**/api/spending-captures/parse", async (route) => {
    parseRequests += 1;
    const body = route.request().postDataJSON() as { captureId: string; parseRevision: number; sourceText: string };
    const primary = await completeOneParse(body, paymentMethodId);
    await route.fulfill({ status: 200, json: {
      ...primary,
      items: [...primary.items, {
        ...primary.items[0],
        id: "44444444-4444-4444-8444-444444444444",
        amount: 3000,
        description: "chai",
        quantity: 1,
      }],
    } });
  });

  await openComposer(page, "7000 somsa 4x and 3000 chai");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("2 expenses added", { exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").syncQueue?.length, appDataKey)).toBe(0);

  await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const captureId = data.spendingCaptures[0].id;
    const deletedId = "44444444-4444-4444-8444-444444444444";
    data.expenses = data.expenses.filter((item: { captureId: string | null; id: string }) => item.captureId !== captureId || item.id === deletedId)
      .map((item: { id: string; deletedAt: string | null; updatedAt: string }) => item.id === deletedId ? { ...item, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
    data.syncQueue = [];
    localStorage.setItem(key, JSON.stringify(data));
  }, appDataKey);
  const beforeReload = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const captureId = data.spendingCaptures[0].id;
    return data.expenses.filter((item: { captureId: string | null }) => item.captureId === captureId).map((item: { id: string; deletedAt: string | null }) => [item.id, Boolean(item.deletedAt)]);
  }, appDataKey);
  expect(beforeReload).toEqual([["44444444-4444-4444-8444-444444444444", true]]);

  await page.reload();
  await expect.poll(async () => page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const capture = data.spendingCaptures[0];
    const linked = data.expenses.filter((item: { captureId: string }) => item.captureId === capture.id);
    return [linked.length, linked.find((item: { id: string }) => item.id === "33333333-3333-4333-8333-333333333333")?.deletedAt ?? null, Boolean(linked.find((item: { id: string }) => item.id === "44444444-4444-4444-8444-444444444444")?.deletedAt)];
  }, appDataKey)).toEqual([2, null, true]);
  expect(parseRequests).toBe(1);
});

test("reload replays every cached expense when the local transaction write was interrupted", async ({ page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  const paymentMethodId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").paymentMethods[0].id, appDataKey);
  let parseRequests = 0;
  await page.route("**/api/spending-captures/parse", async (route) => {
    parseRequests += 1;
    const body = route.request().postDataJSON() as { captureId: string; parseRevision: number; sourceText: string };
    await route.fulfill({ status: 200, json: await completeOneParse(body, paymentMethodId) });
  });

  await openComposer(page, "7000 somsa 4x");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("1 expenses added", { exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").syncQueue?.length, appDataKey)).toBe(0);
  await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const captureId = data.spendingCaptures[0].id;
    data.expenses = data.expenses.filter((item: { captureId: string | null }) => item.captureId !== captureId);
    data.syncQueue = [];
    localStorage.setItem(key, JSON.stringify(data));
  }, appDataKey);
  expect(await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const captureId = data.spendingCaptures[0].id;
    return data.expenses.filter((item: { captureId: string | null }) => item.captureId === captureId).length;
  }, appDataKey)).toBe(0);

  await page.reload();
  await expect.poll(async () => page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) ?? "{}");
    const capture = data.spendingCaptures[0];
    const linked = data.expenses.filter((item: { captureId: string; deletedAt: string | null }) => item.captureId === capture.id && !item.deletedAt);
    return linked.length;
  }, appDataKey)).toBe(1);
  expect(parseRequests).toBe(1);
});

test("a provider failure preserves the note and Retry reuses its capture revision", async ({ page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  const paymentMethodId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").paymentMethods[0].id, appDataKey);
  const requestBodies: Array<{ captureId: string; parseRevision: number; sourceText: string }> = [];
  await page.route("**/api/spending-captures/parse", async (route) => {
    const body = route.request().postDataJSON() as { captureId: string; parseRevision: number; sourceText: string };
    requestBodies.push(body);
    if (requestBodies.length === 1) {
      await route.fulfill({ status: 502, json: { error: "provider_error", message: "Try again." } });
      return;
    }
    await route.fulfill({ status: 200, json: await completeOneParse(body, paymentMethodId) });
  });

  await openComposer(page, "7000 somsa 4x");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const feedback = page.locator("aside[aria-live='polite']");
  await expect(feedback.getByRole("button", { name: "Retry parsing", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spending note: 7000 somsa 4x" })).toBeVisible();
  await feedback.getByRole("button", { name: "Retry parsing", exact: true }).click();
  await expect(page.getByText("1 expenses added", { exact: true })).toBeVisible();
  expect(requestBodies).toHaveLength(2);
  expect(requestBodies[1]).toMatchObject({ captureId: requestBodies[0].captureId, parseRevision: requestBodies[0].parseRevision, sourceText: requestBodies[0].sourceText });
});

test("a 401 parse response exposes a sign-in action while keeping the saved note", async ({ page, baseURL }) => {
  await enterAuthenticatedApp(page, baseURL!);
  await page.route("**/auth/v1/logout**", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("**/api/spending-captures/parse", async (route) => {
    await route.fulfill({ status: 401, json: { error: "unauthenticated", message: "Sign in again." } });
  });

  await openComposer(page, "7000 somsa 4x");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in again", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spending note: 7000 somsa 4x" })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), appDataKey);
  expect(saved.spendingCaptures?.[0]?.sourceText).toBe("7000 somsa 4x");
  await page.getByRole("button", { name: "Sign in again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});
