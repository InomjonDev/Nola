import { expect, test } from "playwright/test";

import { enterDemo, saveExpense } from "./helpers";

test("demo user can add, edit, filter, and delete an expense", async ({ page }) => {
  await enterDemo(page);
  await saveExpense(page, "12.50", "E2E lunch");
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search notes or categories" });
  await search.fill("E2E lunch");
  const result = page.getByRole("button", { name: /Note \(optional\): E2E lunch/ });
  await expect(result).toBeVisible();
  await result.click();
  const edit = page.getByRole("dialog", { name: "Edit expense" });
  await edit.locator("#expense-amount").fill("22.50");
  await edit.getByRole("button", { name: "Shopping", exact: true }).click();
  await expect(edit.getByRole("button", { name: "Shopping", exact: true })).toHaveAttribute("aria-pressed", "true");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(result).toContainText("22.50");
  await expect(result).toContainText("Shopping");
  await result.click();
  await edit.getByRole("button", { name: "Delete expense" }).click();
  await expect(result).toHaveCount(0);
});

test("opaque expense editor closes with Cancel and keeps the app shell mounted", async ({ page }) => {
  await enterDemo(page);
  await page.locator(".workspace-compose-button").click();
  await page.getByRole("button", { name: "Add expense manually", exact: true }).click();
  const manualDialog = page.getByRole("dialog", { name: "Add expense", exact: true });
  await expect(manualDialog).toBeVisible();
  await page.getByRole("button", { name: "Close add expense" }).click();
  await expect(manualDialog).toBeHidden();
  await expect(page.getByRole("dialog", { name: "New spending note", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Spending note" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".workspace-compose-button")).toBeVisible();
});

test("combined overview records income and a monthly budget", async ({ page }) => {
  await enterDemo(page);
  await saveExpense(page, "650", "Budget test expense");
  await page.goto("/insights");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Add income", exact: true }).click();
  await page.getByRole("textbox", { name: "Add income" }).fill("3000");
  await page.getByRole("textbox", { name: "Note (optional)" }).fill("Salary");
  await page.getByRole("button", { name: "Choose date" }).click();
  const calendar = page.getByRole("dialog", { name: "Choose date" });
  await calendar.getByRole("button", { name: "Previous month" }).click();
  await calendar.getByRole("button", { name: "15", exact: true }).click();
  await page.getByRole("dialog", { name: "Add income" }).getByRole("button", { name: "Add income", exact: true }).click();
  await expect(page.getByText("Salary")).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("textbox", { name: "Set monthly budget" }).fill("500");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".cash-summary").getByText("Income", { exact: true })).toBeVisible();
  await expect(page.locator(".cash-summary").getByText("Expenses", { exact: true })).toBeVisible();
  await expect(page.getByText(/Over budget by/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Budget" })).toHaveAttribute("aria-valuenow", "100");
});
