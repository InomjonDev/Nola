import { expect, type Page } from "playwright/test";

export async function enterDemo(page: Page) {
  await page.goto("/");
  const addExpenseButton = page.getByRole("button", { name: "Add expense" });
  if (await addExpenseButton.isVisible().catch(() => false)) return;
  const demoButton = page.getByRole("button", { name: "Try local demo" });
  await expect(demoButton).toBeVisible({ timeout: 15_000 });
  await demoButton.click();
  await expect(page.getByRole("button", { name: "Enter Walletly" })).toBeVisible({ timeout: 10_000 });
  const enterButton = page.getByRole("button", { name: "Enter Walletly" });
  await enterButton.click();
  const acceptButton = page.getByRole("button", { name: "Accept" });
  if (await acceptButton.isVisible().catch(() => false)) await acceptButton.click();
  await expect(addExpenseButton).toBeVisible({ timeout: 10_000 });
}

export async function saveExpense(page: Page, amount: string, note: string) {
  await page.getByRole("button", { name: "Add expense" }).click();
  await page.locator("#expense-amount").fill(amount);
  await page.locator("#expense-note").fill(note);
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
