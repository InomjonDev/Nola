import { expect, test } from "playwright/test";
import { enterDemo } from "./helpers";

test("icon-only navigation and contextual add controls stay flat and reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  for (const name of ["Spending", "Search", "Insights", "Profile"]) await expect(navigation.getByRole("link", { name, exact: true })).toBeVisible();
  const add = page.getByRole("button", { name: "Write a spending note", exact: true });
  const position = await add.boundingBox();
  const navPosition = await navigation.boundingBox();
  expect(position!.width).toBeGreaterThanOrEqual(44);
  expect(position!.height).toBeGreaterThanOrEqual(44);
  expect(position!.x + position!.width).toBeGreaterThan(350);
  expect(position!.y + position!.height).toBeLessThanOrEqual(navPosition!.y - 8);
  await expect(add).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".category-icon-background").first()).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.goto("/insights");
  await expect(page.locator(".cash-summary").getByText("Income", { exact: true })).toBeVisible();
  await expect(page.locator(".cash-summary").getByText("Expenses", { exact: true })).toBeVisible();
  await expect(page.locator('.finance-row[data-kind="income"]').first()).toBeVisible();
  await expect(page.locator('.finance-row[data-kind="expense"]').first()).toBeVisible();
  for (const button of await page.locator(".insights-switch button").all()) {
    await expect(button).toHaveCSS("box-shadow", "none");
    await expect(button).toHaveCSS("border-bottom-width", "0px");
  }
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(page.getByRole("button", { name: "New goal", exact: true })).toHaveClass("primary-add");
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New goal", exact: true })).toBeVisible();
});

test("combined overview can create, edit, and delete income without changing expense totals", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/insights");
  const expenseTotal = page.locator(".cash-summary-item--expense .cash-summary-amount");
  const initialExpenses = await expenseTotal.innerText();
  const add = page.getByRole("button", { name: "Add", exact: true });
  await add.click();
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
  await expect(add).toHaveAttribute("aria-expanded", "false");
  await add.click();
  await page.getByRole("button", { name: "Add income", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Add income", exact: true });
  await editor.getByRole("textbox", { name: "Add income", exact: true }).fill("250");
  await editor.getByRole("textbox", { name: "Note (optional)", exact: true }).fill("Pay day");
  await editor.getByRole("button", { name: "Add income", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator(".cash-summary-item--income .cash-summary-amount")).toHaveText("$2,050.00");
  const row = page.locator('.finance-row[data-kind="income"]').filter({ hasText: "Pay day" });
  await row.click();
  editor = page.getByRole("dialog", { name: "Edit income", exact: true });
  await editor.getByRole("textbox", { name: "Add income", exact: true }).fill("300");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".cash-summary-item--income .cash-summary-amount")).toHaveText("$2,100.00");
  await row.click();
  await editor.getByRole("button", { name: "Delete income", exact: true }).click();
  await expect(page.locator(".cash-summary-item--income .cash-summary-amount")).toHaveText("$1,800.00");
  await expect(expenseTotal).toHaveText(initialExpenses);
});
