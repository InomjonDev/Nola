import { expect, test } from "playwright/test";

import { enterDemo, saveExpense } from "./helpers";

test("demo user can add, edit, filter, and delete an expense", async ({ page }) => {
  await enterDemo(page);
  await saveExpense(page, "12.50", "E2E lunch");
  await page.goto("/history");
  await expect(page.getByText("E2E lunch")).toBeVisible();
  await page.getByRole("button", { name: "Delete expense" }).first().click();
  await expect(page.getByText("E2E lunch")).toHaveCount(0);
});

test("expense sheet closes by clicking outside and keeps the app shell mounted", async ({ page }) => {
  await enterDemo(page);
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator(".expense-sheet-backdrop").click({ position: { x: 6, y: 6 } });
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Add expense" })).toBeVisible();
});

test("income mode records income and a monthly budget", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/insights");
  await page.getByRole("button", { name: "Income" }).click();
  await page.getByRole("textbox", { name: "Add income" }).fill("3000");
  await page.getByRole("textbox", { name: "Note (optional)" }).fill("Salary");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("textbox", { name: "Set monthly budget" }).fill("2000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Income this month")).toBeVisible();
  await expect(page.getByText("Salary")).toBeVisible();
});
