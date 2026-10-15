import { expect, test, type Page } from "playwright/test";

import { E2E_USER_ID, enterAuthenticatedApp } from "./helpers";

const appDataKey = `walletly.app-data.v2-${E2E_USER_ID}`;
const folderId = "10000000-0000-4000-8000-000000000001";
const captureId = "20000000-0000-4000-8000-000000000001";
const expenseId = "30000000-0000-4000-8000-000000000001";
const lunchTagId = "40000000-0000-4000-8000-000000000001";

async function seedSpendingNote(page: Page) {
  await page.evaluate(({ storageKey, folder, capture, expense, tag, userId }) => {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    const now = new Date().toISOString();
    data.tags = [...(data.tags ?? []), { id: tag.id, userId, name: "lunch", updatedAt: now }];
    data.spendingFolders = [{ id: folder.id, userId, name: folder.name, color: "#D2AE32", deletedAt: null, updatedAt: now }];
    data.spendingCaptures = [{
      id: capture.id,
      userId,
      sourceText: "7000 somsa 4x #lunch",
      capturedAt: now,
      folderId: folder.id,
      tagIds: [tag.id],
      parseStatus: "parsed",
      parseRevision: 1,
      parsedRevision: 1,
      parsedItems: [{ id: expense.id, amount: 7000, currency: data.profile.currency, description: "somsa", quantity: 4, spentAt: now, categoryId: "00000000-0000-4000-8000-000000000001", paymentMethodId: data.paymentMethods[0].id, tagIds: [tag.id] }],
      deletedAt: null,
      updatedAt: now,
    }];
    data.expenses = [...(data.expenses ?? []), {
      id: expense.id,
      userId,
      amount: 7000,
      currency: data.profile.currency,
      spentAt: now,
      categoryId: "00000000-0000-4000-8000-000000000001",
      paymentMethodId: data.paymentMethods[0].id,
      captureId: capture.id,
      quantity: 4,
      note: "somsa",
      tagIds: [tag.id],
      deletedAt: null,
      updatedAt: now,
    }];
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, {
    storageKey: appDataKey,
    userId: E2E_USER_ID,
    folder: { id: folderId, name: "Lunch" },
    capture: { id: captureId },
    expense: { id: expenseId },
    tag: { id: lunchTagId },
  });
}

test("spending notes navigate through folders, search, and detail on mobile and desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The navigation flow switches between desktop and mobile widths in one run.");
  await enterAuthenticatedApp(page);
  await seedSpendingNote(page);
  await page.reload();

  await page.setViewportSize({ width: 1280, height: 900 });
  const folderNavigation = page.getByRole("navigation", { name: "Folders" });
  await folderNavigation.getByRole("button", { name: "Rename folder: Lunch" }).click();
  const renameDialog = page.getByRole("dialog", { name: "Rename folder" });
  await expect(renameDialog.getByRole("textbox", { name: "Folder name" })).toHaveValue("Lunch");
  await renameDialog.getByRole("textbox", { name: "Folder name" }).fill("Lunch expenses");
  await renameDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(renameDialog).toBeHidden();
  await folderNavigation.getByRole("button", { name: "New folder", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "New folder" });
  await createDialog.getByRole("textbox", { name: "Folder name" }).fill("Travel");
  await createDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(createDialog).toBeHidden();
  await folderNavigation.getByRole("button", { name: "Rename folder: Lunch expenses" }).click();
  const duplicateRenameDialog = page.getByRole("dialog", { name: "Rename folder" });
  await duplicateRenameDialog.getByRole("textbox", { name: "Folder name" }).fill("travel");
  await duplicateRenameDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(duplicateRenameDialog.getByRole("alert")).toHaveText("Use a unique folder name with up to 60 characters.");
  await duplicateRenameDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(duplicateRenameDialog).toBeHidden();
  await folderNavigation.getByRole("link", { name: /^Lunch expenses(?: \d+)?$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/folders/${folderId}$`));
  await expect(page.getByRole("button", { name: /Spending note: 7000 somsa 4x #lunch/ })).toBeVisible();
  await expect(page.getByText("#lunch", { exact: true })).toBeVisible();
  await expect(page.getByText("Coffee", { exact: true })).toHaveCount(0);

  await folderNavigation.getByRole("link", { name: "All spending" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /Spending note: 7000 somsa 4x #lunch/ })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search notes or categories" });
  await search.fill("7000");
  await expect(page).toHaveURL(/\/\?q=7000$/);
  await expect(page.getByRole("button", { name: /Spending note: 7000 somsa 4x #lunch/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Amount:.*Amount: \$7,000\.00, Category: Food, Payment method: Card, Date:/ })).toBeVisible();
  await search.fill("#lunch");
  const taggedCapture = page.getByRole("button", { name: /Tags: 7000 somsa 4x #lunch/ }).first();
  await expect(taggedCapture).toBeVisible();
  await taggedCapture.click();
  await expect(page).toHaveURL(new RegExp(`/captures/${captureId}$`));
  await expect(page.getByRole("textbox", { name: "Spending note" })).toHaveValue("7000 somsa 4x #lunch");
  await page.getByRole("button", { name: /1 expense, \$7,000\.00\. Linked expenses/ }).click();
  const linkedExpenses = page.getByRole("dialog", { name: "Linked expenses" });
  await expect(linkedExpenses.getByRole("button", { name: /Edit: somsa.*Amount: \$7,000\.00, Category: Food, Payment method: Card, Date:/ })).toBeVisible();
  await linkedExpenses.getByRole("button", { name: "Close", exact: true }).click();
  await expect(linkedExpenses).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("textbox", { name: "Spending note" })).toHaveValue("7000 somsa 4x #lunch");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Spending", exact: true })).toBeVisible();
  await expect(page.locator(".spending-workspace.has-selected-capture .spending-list-pane")).toBeHidden();

  await page.goto("/");
  await page.getByRole("button", { name: "Folders", exact: true }).click();
  const mobileFolders = page.getByRole("navigation", { name: "Folders" });
  await expect(mobileFolders).toBeVisible();
  await mobileFolders.getByRole("link", { name: /^Lunch expenses(?: \d+)?$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/folders/${folderId}$`));
  await expect(page.getByRole("button", { name: /Spending note: 7000 somsa 4x #lunch/ })).toBeVisible();
});
