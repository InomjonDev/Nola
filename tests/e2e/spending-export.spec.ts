import { readFileSync } from "node:fs";
import { expect, test } from "playwright/test";

import { enterAuthenticatedApp } from "./helpers";

const userId = "11111111-1111-4111-8111-111111111111";
const appDataKey = `walletly.app-data.v2-${userId}`;
const sourceText = "7000 somsa 4x, Oʻzbekiston, Ўзбекистон, Қўқон, расходы";

test("Settings downloads CSV, Markdown, and a Unicode PDF report for a spending note", async ({ page }) => {
  await enterAuthenticatedApp(page, "UZS");
  const paymentMethodId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").paymentMethods[0].id, appDataKey);
  await page.route("**/api/spending-captures/parse", async (route) => {
    const body = route.request().postDataJSON() as { captureId: string; parseRevision: number; sourceText: string };
    expect(body.sourceText).toBe(sourceText);
    await route.fulfill({ status: 200, json: {
      captureId: body.captureId,
      parseRevision: body.parseRevision,
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
    } });
  });

  await page.locator(".workspace-compose-button").click();
  await page.getByRole("textbox", { name: "Spending note" }).fill(sourceText);
  await page.getByRole("button", { name: "Done", exact: true }).last().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Saved money actions: 1", { exact: true })).toBeVisible();
  await page.goto("/settings");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("nola-export.csv");
  const captureId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").spendingCaptures[0].id, appDataKey);
  const csvPath = await csv.path();
  expect(csvPath).not.toBeNull();
  const csvText = readFileSync(csvPath!, "utf8");
  expect(csvText).toContain("capture_id,quantity");
  expect(csvText).toContain(`"${captureId}","4"`);

  const markdownPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  const markdown = await markdownPromise;
  expect(markdown.suggestedFilename()).toBe("nola-export.md");
  const markdownPath = await markdown.path();
  expect(markdownPath).not.toBeNull();
  const markdownText = readFileSync(markdownPath!, "utf8");
  expect(markdownText).toContain(sourceText);
  expect(markdownText).toContain("| somsa | 7000 UZS |");

  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const pdf = await pdfPromise;
  expect(pdf.suggestedFilename()).toBe("nola-spending.pdf");
  const pdfPath = await pdf.path();
  expect(pdfPath).not.toBeNull();
  const pdfBytes = readFileSync(pdfPath!);
  expect(pdfBytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdfBytes.toString("latin1")).toContain("/FontFile2");
});
