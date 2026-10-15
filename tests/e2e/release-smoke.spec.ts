import { expect, test } from "playwright/test";

import { enterAuthenticatedApp } from "./helpers";

test("a spending note saves when leaving the editor and opens again", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "Desktop note entry controls are intentionally hidden.");
  await enterAuthenticatedApp(page);
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

test("desktop spending layout fills the viewport without note buttons", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop-only layout check.");
  await enterAuthenticatedApp(page);

  const viewportWidth = page.viewportSize()!.width;
  const shellWidth = await page.locator(".app-shell").evaluate((element) => element.getBoundingClientRect().width);
  expect(shellWidth).toBeCloseTo(Math.min(viewportWidth * 0.9, 2200), 0);
  await expect(page.locator(".desktop-capture-action")).toBeHidden();
  await expect(page.locator(".workspace-compose-button")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportWidth);
});
