import { expect, test } from "playwright/test";

import { enterDemo } from "./helpers";

test("a spending note saves when leaving the editor and opens again", async ({ page }) => {
  await enterDemo(page);
  await page.locator(".workspace-compose-button").click();

  const note = page.getByRole("textbox", { name: "Spending note" });
  await expect(page.getByRole("dialog", { name: "Today" })).toBeVisible();
  await note.fill("Lunch 35,000 UZS");
  await page.getByRole("dialog", { name: "Today" }).locator(".capture-editor-back").click();

  const savedNote = page.getByRole("button", { name: /Spending note: Lunch 35,000 UZS/ });
  await expect(savedNote).toBeVisible();
  await savedNote.click();
  await expect(page.getByRole("textbox", { name: "Spending note" })).toHaveValue("Lunch 35,000 UZS");
});
