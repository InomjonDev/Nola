import { expect, test, type Page } from "playwright/test";

import { createTranslator, languageLocale, type TranslationKey } from "../../src/lib/i18n";
import type { Language } from "../../src/lib/types";
import { enterDemo, saveExpense } from "./helpers";

async function noPageOverflow(page: Page) {
  const size = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(size.document).toBeLessThanOrEqual(size.viewport + 1);
}

async function checkVisibleTextContrast(page: Page) {
  const failures = await page.evaluate(() => {
    function rgb(value: string) { return (value.match(/[\d.]+/g) ?? []).map(Number); }
    function background(element: Element | null): number[] {
      if (!element) return [255, 255, 255];
      const color = rgb(getComputedStyle(element).backgroundColor);
      const alpha = color[3] ?? 1;
      if (alpha >= 1) return color.slice(0, 3);
      const parent = background(element.parentElement);
      return parent.map((value, index) => value * (1 - alpha) + (color[index] ?? 0) * alpha);
    }
    function luminance(color: number[]) {
      return color.map((value) => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    }
    return Array.from(document.querySelectorAll<HTMLElement>("p, span, h1, h2, h3, a, button, label, legend"))
      .filter((element) => Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) && element.getClientRects().length && !element.closest("[inert], [disabled], [aria-hidden='true']"))
      .flatMap((element) => {
        const style = getComputedStyle(element);
        if (style.visibility === "hidden") return [];
        const foreground = luminance(rgb(style.color).slice(0, 3));
        const bg = luminance(background(element));
        const ratio = (Math.max(foreground, bg) + .05) / (Math.min(foreground, bg) + .05);
        return ratio < 4.5 ? [{ text: element.textContent?.trim().slice(0, 70), ratio, color: style.color }] : [];
      });
  });
  expect(failures, JSON.stringify(failures)).toEqual([]);
}

test("every screen stays readable across themes and languages", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  for (const [amount, note] of [["8", "Lunch"], ["14", "Market"], ["25", "Dinner"]]) await saveExpense(page, amount, note);
  const routes: Array<[string, TranslationKey]> = [
    ["/", "nav.spending"], ["/insights", "nav.insights"],
    ["/manage", "manage.title"], ["/profile", "nav.profile"], ["/settings", "settings.title"],
    ["/privacy", "legal.privacyTitle"], ["/terms", "legal.termsTitle"], ["/cookies", "legal.cookiesTitle"], ["/data-deletion", "legal.deletionTitle"],
  ];
  for (const language of ["en", "ru", "uz"] as Language[]) {
    await page.goto("/settings");
    await page.getByRole("button", { name: language === "en" ? "English" : language === "ru" ? "Русский" : "O‘zbekcha", exact: true }).click();
    const t = createTranslator(language);
    await expect(page.locator("html")).toHaveAttribute("lang", languageLocale(language));
    for (const theme of ["light", "dark"] as const) {
      await page.goto("/settings");
      await page.getByRole("button", { name: t(`settings.${theme}`), exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const [path, title] of routes) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: t(title), exact: true }).first()).toBeVisible();
        await expect(page.locator("body")).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");
        await noPageOverflow(page);
        await checkVisibleTextContrast(page);
        if (["/", "/settings", "/insights"].includes(path)) {
          await page.screenshot({ path: testInfo.outputPath(`${language}-${theme}-${path === "/" ? "home" : path.slice(1)}.png`), fullPage: true, animations: "disabled" });
        }
        if (path === "/") {
          const rows = await page.locator(".spending-list-scroll button").count();
          expect(rows).toBeGreaterThanOrEqual(3);
          await expect(page.getByRole("navigation", { name: t("nav.main") }).getByRole("link", { name: t("nav.spending"), exact: true })).toHaveAttribute("aria-current", "page");
          await expect(page.getByRole("searchbox", { name: t("history.search") })).toBeVisible();
          await expect(page.getByRole("navigation", { name: t("nav.main") }).getByRole("link", { name: "Search", exact: true })).toHaveCount(0);
        }
      }
      await page.goto("/add-expense");
      const dialog = page.getByRole("dialog", { name: t("expense.addTitle"), exact: true });
      await expect(dialog).toBeVisible();
      await noPageOverflow(page);
      await checkVisibleTextContrast(page);
      await expect(page.locator(".expense-sheet")).toHaveCSS("box-shadow", "none");
      await expect(page.locator(".expense-sheet")).toHaveCSS("border-radius", "0px");
      await expect(page.locator(".expense-sheet-backdrop")).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");
      await page.screenshot({ path: testInfo.outputPath(`${language}-${theme}-expense.png`), fullPage: true, animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await page.goto("/goals");
      await page.getByRole("button", { name: t("goals.new"), exact: true }).click();
      const goal = page.getByRole("dialog", { name: t("goals.new"), exact: true });
      await expect(goal).toBeVisible();
      await noPageOverflow(page);
      await checkVisibleTextContrast(page);
      await page.screenshot({ path: testInfo.outputPath(`${language}-${theme}-goal.png`), fullPage: true, animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(goal).toBeHidden();
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("html")).toHaveAttribute("lang", languageLocale(language));
    }
  }
});

test("large UZS amounts, keyboard focus, and responsive text stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Try local demo" }).click();
  await page.getByRole("button", { name: "UZS", exact: true }).click();
  await page.getByRole("button", { name: "Enter Nola" }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  const add = page.getByRole("button", { name: "Write a spending note", exact: true });
  await add.click();
  await page.getByRole("button", { name: "Add expense manually", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add expense", exact: true });
  await expect(dialog.getByRole("textbox", { name: "Amount" })).toBeFocused();
  await page.locator("#expense-amount").fill("1234567890.12");
  await page.locator("#expense-note").fill("Long expense note with enough text to wrap comfortably on a small phone");
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();
  const amount = page.getByRole("button", { name: /expense: Long expense note/ });
  await expect(amount).toContainText("1,234,567,890.12");
  expect(await amount.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await noPageOverflow(page);
  for (const size of [[375, 812], [844, 390], [768, 1024], [1280, 900]]) {
    await page.setViewportSize({ width: size[0], height: size[1] });
    await noPageOverflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await add.click();
  await page.getByRole("button", { name: "Add expense manually", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator(".expense-sheet")).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await noPageOverflow(page);
});
