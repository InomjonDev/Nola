import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "playwright/test";

import { createTranslator, languageLocale } from "../../src/lib/i18n";
import { formatAmountDraft } from "../../src/lib/currency-input";
import { enterDemo, oauthSession } from "./helpers";

async function createGoal(page: Page, name = "Emergency fund", target = "100") {
  await page.goto("/insights?tab=goals");
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New goal", exact: true });
  await dialog.getByRole("textbox", { name: "Goal name" }).fill(name);
  await dialog.getByRole("textbox", { name: "Target amount" }).fill(target);
  await dialog.getByRole("button", { name: "Travel", exact: true }).click();
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).toBeHidden();
}

async function contribute(page: Page, amount: string, kind: "deposit" | "withdrawal" = "deposit") {
  const name = kind === "deposit" ? "Add savings" : "Withdraw savings";
  await page.getByRole("button", { name, exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name, exact: true });
  await dialog.getByRole("textbox", { name: /Amount/ }).fill(amount);
  await dialog.getByRole("button", { name, exact: true }).click();
  return dialog;
}

test("goals support lifecycle, history, withdrawals, exports, and home preview", async ({ page }) => {
  test.setTimeout(90_000);
  await enterDemo(page);
  await createGoal(page);
  await page.getByRole("button", { name: "Emergency fund", exact: true }).click();
  await page.getByRole("button", { name: "Edit goal" }).click();
  let dialog = page.getByRole("dialog", { name: "Edit goal" });
  await dialog.getByRole("textbox", { name: "Goal name" }).fill("Travel fund");
  await dialog.getByRole("button", { name: /Deadline/ }).click();
  await dialog.getByRole("button", { name: "Next month" }).click();
  await dialog.getByRole("button", { name: /15/ }).click();
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).toBeHidden();

  dialog = await contribute(page, "125");
  await expect(dialog).toBeHidden();
  let completion = page.getByRole("dialog", { name: "Goal reached" });
  await expect(completion.getByText("You reached your target.")).toBeVisible();
  await expect(page.getByTestId("goal-confetti")).toBeVisible();
  await expect(completion.getByRole("button", { name: "Archive goal", exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Travel fund" })).toHaveAttribute("aria-valuenow", "100");
  await completion.getByRole("button", { name: "Keep active" }).click();
  await expect(completion).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Goal reached" })).toHaveCount(0);
  dialog = await contribute(page, "126", "withdrawal");
  await expect(dialog.getByRole("alert")).toContainText("exceeds");
  await dialog.getByRole("textbox", { name: /Amount/ }).fill("25");
  await dialog.getByRole("button", { name: "Withdraw savings", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Travel fund", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Travel fund", exact: true });
  await expect(dialog.getByText("Savings added", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Savings withdrawn", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Edit goal" }).click();
  dialog = page.getByRole("dialog", { name: "Edit goal" });
  await expect(dialog.getByRole("button", { name: "EUR", exact: true })).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Target amount" }).fill("200");
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("progressbar", { name: "Travel fund" })).toHaveAttribute("aria-valuenow", "50");
  dialog = await contribute(page, "100");
  await expect(dialog).toBeHidden();
  completion = page.getByRole("dialog", { name: "Goal reached" });
  await expect(page.getByTestId("goal-confetti")).toBeVisible();
  await completion.getByRole("button", { name: "Archive goal", exact: true }).click();
  await expect(completion).toBeHidden();
  await expect(page.getByRole("button", { name: "Archived", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Archived", exact: true })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(page.getByRole("button", { name: "Travel fund", exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Savings goals" }).getByText("Travel fund", { exact: true })).toHaveCount(0);
  await page.goto("/insights?tab=goals");
  await expect(page.getByRole("button", { name: "Goals", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await page.getByRole("button", { name: "Travel fund", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Add savings" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reopen goal" }).click();
  await expect(page.getByRole("button", { name: "Active", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Savings goals" }).getByText("Travel fund")).toBeVisible();

  await page.goto("/settings");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const json = await jsonDownload;
  const exported = JSON.parse(await readFile((await json.path())!, "utf8"));
  expect(exported.savingsGoals).toHaveLength(2);
  expect(exported.savingsGoals).toEqual(expect.arrayContaining([expect.objectContaining({ targetAmount: 200 }), expect.objectContaining({ name: "Future plans" })]));
  expect(exported.goalContributions).toHaveLength(4);
  expect(exported.expenses).toHaveLength(3);
  expect(exported.incomeEntries).toHaveLength(1);
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await readFile((await (await csvDownload).path())!, "utf8");
  expect(csv).toContain('"savings_goal"');
  expect(csv).toContain('"withdrawal"');
  await page.goto("/insights?tab=goals");
  await page.getByRole("button", { name: "Travel fund", exact: true }).click();
  await page.getByRole("button", { name: "Delete goal" }).click();
  dialog = page.getByRole("dialog", { name: "Delete this savings goal?" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Travel fund" })).toBeVisible();
  await page.getByRole("button", { name: "Delete goal" }).click();
  await page.getByRole("dialog", { name: "Delete this savings goal?" }).getByRole("button", { name: "Delete goal" }).click();
  await expect(page.getByText("Future plans", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Future plans", { exact: true })).toBeVisible();
});

test("goal sheets are keyboard accessible, localized, themed and responsive", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await enterDemo(page);
  await createGoal(page, "A very long savings goal name for our next family adventure", "1000");
  for (const language of ["en", "ru", "uz"] as const) {
    const t = createTranslator(language);
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate(({ language, theme }) => { localStorage.setItem("walletly.language", language); localStorage.setItem("walletly.theme-mode", theme); }, { language, theme });
      await page.reload();
      await expect(page.getByRole("heading", { name: t("goals.savings") })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".min-h-dvh.bg-bg")).toHaveCSS("background-color", theme === "light" ? "rgb(242, 240, 248)" : "rgb(13, 12, 16)");
      await expect(page.locator(".min-h-dvh.bg-bg")).toHaveCSS("color", theme === "light" ? "rgb(23, 21, 29)" : "rgb(247, 245, 250)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`goals-${language}-${theme}.png`), fullPage: true });
      await page.getByRole("button", { name: t("goals.new"), exact: true }).click();
      const dialog = page.getByRole("dialog", { name: t("goals.new"), exact: true });
      await expect(dialog.getByRole("textbox", { name: t("goals.name") })).toBeFocused();
      expect(await dialog.locator("select, input[type=date]").count()).toBe(0);
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.getByRole("button", { name: t("goals.close"), exact: true })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.getByRole("button", { name: t("goals.save"), exact: true })).toBeFocused();
      await dialog.getByRole("button", { name: new RegExp(t("goals.deadline").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
      const calendarButtons = dialog.getByRole("group", { name: t("goals.deadline") }).locator("button");
      const sizes = await calendarButtons.evaluateAll((buttons) => buttons.map((button) => { const bounds = button.getBoundingClientRect(); return { width: bounds.width, height: bounds.height }; }));
      expect(sizes.every(({ width, height }) => width >= 43.9 && height >= 44)).toBe(true);
      expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`goal-sheet-${language}-${theme}.png`) });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("button", { name: t("goals.new"), exact: true })).toBeFocused();
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const t = createTranslator("uz");
  await page.getByRole("button", { name: t("goals.new"), exact: true }).click();
  await expect(page.locator(".goal-sheet")).toHaveCSS("animation-name", "none");
  await page.locator(".goal-sheet-backdrop").click({ position: { x: 3, y: 3 } });
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("cloud goals recover offline changes with parent ordering and idempotent retries", async ({ context, page, baseURL }) => {
  test.setTimeout(90_000);
  const session = oauthSession();
  const records = new Map<string, Map<string, Record<string, unknown>>>();
  let acceptedThenFailed = false;
  let contributionAttempts = 0;
  let parentErrors = 0;
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 302, headers: { location: new URL("/auth/callback?code=goals-test", baseURL).href } }));
  await page.route("**/auth/v1/token**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/rest/v1/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1)!;
    const rows = records.get(table) ?? new Map<string, Record<string, unknown>>();
    records.set(table, rows);
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      if (table === "goal_contributions") {
        contributionAttempts += 1;
        if (!records.get("savings_goals")?.has(payload.goal_id)) {
          parentErrors += 1;
          return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Missing parent" }) });
        }
      }
      rows.set(payload.id, payload);
      if (table === "goal_contributions" && !acceptedThenFailed) {
        acceptedThenFailed = true;
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Response lost after saving" }) });
      }
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(table === "profiles" && rows.size ? [...rows.values()][0] : [...rows.values()]) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.getByRole("button", { name: "Enter Walletly" }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("walletly.app-data.v2-11111111-1111-4111-8111-111111111111") ?? "{}").syncQueue?.length)).toBe(0);
  await page.goto("/insights?tab=goals");
  await context.setOffline(true);
  // The route is already mounted; offline mutations must not require navigation.
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  const form = page.getByRole("dialog", { name: "New goal", exact: true });
  await form.getByRole("textbox", { name: "Goal name" }).fill("Offline fund");
  await form.getByRole("textbox", { name: "Target amount" }).fill("100");
  await form.getByRole("button", { name: "Save goal" }).click();
  await expect(form).toBeHidden();
  await expect(await contribute(page, "40")).toBeHidden();
  await page.getByRole("button", { name: "Offline fund", exact: true }).click();
  await page.getByRole("button", { name: "Edit goal" }).click();
  await page.getByRole("textbox", { name: "Target amount" }).fill("200");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await context.setOffline(false);
  await expect.poll(() => records.get("goal_contributions")?.size ?? 0).toBe(1);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("walletly.app-data.v2-11111111-1111-4111-8111-111111111111") ?? "{}").syncQueue?.length)).toBe(0);
  expect(contributionAttempts).toBe(2);
  expect(parentErrors).toBe(0);
  await page.reload();
  await expect(page.getByRole("progressbar", { name: "Offline fund" })).toHaveAttribute("aria-valuenow", "20");
  await context.setOffline(true);
  await expect(await contribute(page, "10", "withdrawal")).toBeHidden();
  await context.setOffline(false);
  await expect.poll(() => records.get("goal_contributions")?.size ?? 0).toBe(2);
  await page.reload();
  await expect(page.getByRole("progressbar", { name: "Offline fund" })).toHaveAttribute("aria-valuenow", "15");
});

test("cached PWA goals survive a fully offline reload and new contributions", async ({ context, page }) => {
  test.setTimeout(90_000);
  await enterDemo(page);
  await createGoal(page, "Offline PWA", "100");
  await expect(await contribute(page, "40")).toBeHidden();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  // Warm all script assets under the controlling worker before going offline.
  await page.reload();
  await expect(page.getByRole("progressbar", { name: "Offline PWA" })).toHaveAttribute("aria-valuenow", "40");
  await expect.poll(async () => page.evaluate(async () => {
    const cache = await caches.open("walletly-shell-v4");
    const keys = (await cache.keys()).map((request) => request.url);
    return keys.some((url) => url.includes("/insights?tab=goals") && !url.includes("_rsc")) && keys.some((url) => url.includes("/_next/static/"));
  })).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar", { name: "Offline PWA" })).toHaveAttribute("aria-valuenow", "40");
  await expect(await contribute(page, "10")).toBeHidden();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar", { name: "Offline PWA" })).toHaveAttribute("aria-valuenow", "50");
  await context.setOffline(false);
});

test("all financial amount fields live-format by locale and preserve the edit caret", async ({ page }) => {
  test.setTimeout(90_000);
  await enterDemo(page);
  await createGoal(page, "Formatting goal", "250");

  for (const language of ["en", "ru", "uz"] as const) {
    await page.evaluate((nextLanguage) => localStorage.setItem("walletly.language", nextLanguage), language);
    await page.reload();
    const t = createTranslator(language);
    const locale = languageLocale(language);
    const formatted = formatAmountDraft("1234567.89", locale).display;

    await page.goto("/add-expense");
    const expenseAmount = page.locator("#expense-amount");
    await expect(expenseAmount).toHaveAttribute("lang", locale);
    await expenseAmount.fill("1234567.89");
    await expect(expenseAmount).toHaveValue(formatted);
    await expenseAmount.press("Home");
    await page.keyboard.type("9");
    await expect(expenseAmount).toHaveValue(formatAmountDraft("91234567.89", locale).display);

    await page.goto("/insights");
    await page.getByRole("button", { name: t("insights.income"), exact: true }).click();
    const incomeAmount = page.getByRole("textbox", { name: t("insights.addIncome") });
    await incomeAmount.fill("1234567.89");
    await expect(incomeAmount).toHaveValue(formatted);
    const budgetAmount = page.getByRole("textbox", { name: t("insights.addBudget") });
    await budgetAmount.fill("1234567.89");
    await expect(budgetAmount).toHaveValue(formatted);

    await page.goto("/insights?tab=goals");
    await page.getByRole("button", { name: "Formatting goal", exact: true }).click();
    await page.getByRole("dialog", { name: "Formatting goal" }).getByRole("button", { name: t("goals.edit") }).click();
    const targetAmount = page.getByRole("dialog", { name: t("goals.edit") }).getByRole("textbox", { name: t("goals.target") });
    await targetAmount.fill("1234567.89");
    await expect(targetAmount).toHaveValue(formatted);
    await page.getByRole("dialog", { name: t("goals.edit") }).getByRole("button", { name: t("goals.save") }).click();

    await page.getByRole("button", { name: "Formatting goal", exact: true }).click();
    await page.getByRole("dialog", { name: "Formatting goal" }).getByRole("button", { name: t("goals.addSavings") }).click();
    const contributionAmount = page.getByRole("dialog", { name: t("goals.addSavings") }).getByRole("textbox", { name: new RegExp(t("goals.amount")) });
    await contributionAmount.fill("1234567.89");
    await expect(contributionAmount).toHaveValue(formatted);
    await page.getByRole("dialog", { name: t("goals.addSavings") }).getByRole("button", { name: t("goals.close") }).click();
  }
});
