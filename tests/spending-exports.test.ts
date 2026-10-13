import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { jsPDF } from "jspdf";

import { exportNolaData } from "../src/lib/export-data.ts";
import { buildSpendingPdfReport, sanitizePdfText, writeSpendingPdfDocument } from "../src/lib/export-pdf.ts";
import type { Expense, PersistedAppData, SpendingCapture, SpendingFolder } from "../src/lib/types.ts";

const activeCapture: SpendingCapture = {
  id: "capture-1",
  userId: "user-1",
  sourceText: "7000 somsa 4x\n1500 choy",
  capturedAt: "2026-10-12T10:30:00.000Z",
  folderId: "folder-1",
  tagIds: ["tag-1"],
  parseStatus: "parsed",
  parseRevision: 1,
  parsedRevision: 1,
  parsedItems: null,
  deletedAt: null,
  updatedAt: "2026-10-12T10:30:00.000Z",
};

const activeFolder: SpendingFolder = {
  id: "folder-1",
  userId: "user-1",
  name: "Lunch notes",
  color: "#e7bd35",
  deletedAt: null,
  updatedAt: "2026-10-12T10:30:00.000Z",
};

function expense(id: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id,
    userId: "user-1",
    amount: 7000,
    currency: "UZS",
    spentAt: "2026-10-12T10:00:00.000Z",
    categoryId: "food",
    paymentMethodId: "cash",
    captureId: "capture-1",
    quantity: 4,
    note: "somsa",
    tagIds: ["tag-1"],
    deletedAt: null,
    updatedAt: "2026-10-12T10:30:00.000Z",
    ...overrides,
  };
}

const data: PersistedAppData = {
  profile: null,
  categories: [{ id: "food", userId: null, name: "Food", color: "#eea12b", kind: "global", archivedAt: null, updatedAt: "2026-10-12T00:00:00.000Z" }],
  paymentMethods: [{ id: "cash", userId: "user-1", name: "Cash", archivedAt: null, updatedAt: "2026-10-12T00:00:00.000Z" }],
  tags: [{ id: "tag-1", userId: "user-1", name: "lunch", updatedAt: "2026-10-12T00:00:00.000Z" }],
  expenses: [
    expense("expense-1"),
    expense("expense-2", { amount: 1500, quantity: null, note: "choy" }),
    expense("expense-standalone", { amount: 900, captureId: null, quantity: null, note: '=HYPERLINK("https://example.com")', tagIds: [] }),
    expense("expense-deleted", { deletedAt: "2026-10-12T11:00:00.000Z" }),
  ],
  spendingCaptures: [
    activeCapture,
    { ...activeCapture, id: "capture-deleted", deletedAt: "2026-10-12T11:00:00.000Z" },
  ],
  spendingFolders: [activeFolder, { ...activeFolder, id: "folder-deleted", deletedAt: "2026-10-12T11:00:00.000Z" }],
  incomeEntries: [],
  budgets: [],
  categoryBudgets: [],
  recurringRules: [],
  accounts: [],
  accountAdjustments: [],
  savingsGoals: [],
  goalContributions: [],
  syncQueue: [],
};

test("JSON export includes active captures and folders with linked expenses, excluding deleted records", () => {
  const exported = JSON.parse(exportNolaData(data, "json")) as Record<string, unknown>;
  assert.deepEqual(exported.spendingCaptures, [activeCapture]);
  assert.deepEqual(exported.spendingFolders, [activeFolder]);
  assert.deepEqual((exported.expenses as Expense[]).map((item) => item.id), ["expense-1", "expense-2", "expense-standalone"]);
  assert.equal(exported.syncQueue, undefined);
});

test("CSV keeps one row per active expense and exports capture_id and quantity safely", () => {
  const csv = exportNolaData(data, "csv");
  const lines = csv.split("\n");
  assert.equal(lines[0].endsWith(",capture_id,quantity"), true);
  assert.equal(lines.length, 4, "header plus exactly one row per active expense");
  assert.ok(lines.some((line) => line.includes('"expense-1"') && line.endsWith('"capture-1","4"')));
  assert.ok(lines.some((line) => line.includes('"expense-2"') && line.endsWith('"capture-1",""')));
  assert.ok(lines.some((line) => line.includes('"expense-standalone"') && line.endsWith('"",""')));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.com"")"'));
  assert.ok(!csv.includes('"expense-deleted"'));
});

test("Markdown exports original note text, folder and tags, and linked rows without a duplicate capture total", () => {
  const markdown = exportNolaData(data, "markdown");
  assert.equal((markdown.match(/^## Spending note/gm) ?? []).length, 1);
  assert.ok(markdown.includes("7000 somsa 4x\n1500 choy"));
  assert.ok(markdown.includes("- Folder: Lunch notes"));
  assert.ok(markdown.includes("- Tags: lunch"));
  assert.ok(markdown.includes("| 2026-10-12T10:00:00.000Z | somsa | 7000 UZS | Food | Cash | 4 | lunch |"));
  assert.ok(markdown.includes("| 2026-10-12T10:00:00.000Z | choy | 1500 UZS | Food | Cash |  | lunch |"));
  assert.ok(markdown.includes("## Standalone expenses"));
  assert.ok(markdown.includes('=HYPERLINK("https://example.com")'));
  assert.ok(!markdown.includes("expense-deleted"));
  assert.ok(!markdown.includes("Total"));
});

test("PDF report keeps capture context linked to its expense rows and counts only structured expenses", () => {
  const report = buildSpendingPdfReport(data);
  assert.equal(report.captures.length, 1);
  assert.deepEqual(report.captures[0]?.expenses.map((item) => item.note), ["somsa", "choy"]);
  assert.equal(report.standaloneExpenses.length, 1);
  assert.deepEqual(report.totalsByCurrency, [{ currency: "UZS", amount: 9400 }]);
  assert.equal(report.captures[0]?.folderName, "Lunch notes");
  assert.deepEqual(report.captures[0]?.tagNames, ["lunch"]);
});

test("PDF sanitizer removes control characters while preserving Uzbek, Russian, and line breaks", () => {
  assert.equal(
    sanitizePdfText("Oʻzbekiston\t\u0000\nЎзбекистон\u001B\u007F\u0085\u000Bрасходы"),
    "Oʻzbekiston \nЎзбекистонрасходы",
  );
});

test("PDF can be scoped to one capture and embeds the Noto fonts for Russian and Uzbek text", () => {
  const localizedCapture = { ...activeCapture, sourceText: "7000 somsa 4x, Oʻzbekiston, Ўзбекистон, Қўқон, расходы" };
  const localizedData = { ...data, spendingCaptures: [localizedCapture], expenses: data.expenses.filter((item) => item.captureId === localizedCapture.id) };
  const report = buildSpendingPdfReport(localizedData, localizedCapture.id);
  assert.equal(report.captures.length, 1);
  assert.equal(report.standaloneExpenses.length, 0);
  assert.deepEqual(report.totalsByCurrency, [{ currency: "UZS", amount: 8500 }]);

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const regular = readFileSync(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)).toString("base64");
  const bold = readFileSync(new URL("../public/fonts/NotoSans-Bold.ttf", import.meta.url)).toString("base64");
  doc.addFileToVFS("NotoSans-Regular.ttf", regular);
  doc.addFileToVFS("NotoSans-Bold.ttf", bold);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  writeSpendingPdfDocument(doc, report);
  const bytes = Buffer.from(doc.output("arraybuffer"));
  assert.ok(bytes.subarray(0, 5).toString("ascii") === "%PDF-");
  assert.ok(bytes.toString("latin1").includes("/FontFile2"), "the generated report embeds its TTF font programs");
});
