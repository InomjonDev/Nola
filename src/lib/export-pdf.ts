import type { jsPDF } from "jspdf";

import type { Expense, PersistedAppData, SpendingCapture } from "./types.ts";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - 46;
const LINE_HEIGHT = 11;

type PdfExpense = Pick<Expense, "amount" | "currency" | "spentAt" | "categoryId" | "paymentMethodId" | "captureId" | "quantity" | "note" | "deletedAt">;

/** Remove control characters that can confuse PDF text layout while keeping Unicode and newlines. */
export function sanitizePdfText(value: string) {
  let sanitized = "";
  let previousWasCarriageReturn = false;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 13) {
      sanitized += "\n";
      previousWasCarriageReturn = true;
      continue;
    }
    if (codePoint === 10) {
      if (!previousWasCarriageReturn) sanitized += "\n";
      previousWasCarriageReturn = false;
      continue;
    }
    previousWasCarriageReturn = false;
    if (codePoint === 9) {
      sanitized += " ";
      continue;
    }
    const isC0Control = (codePoint >= 0 && codePoint <= 8) || codePoint === 11 || codePoint === 12 || (codePoint >= 14 && codePoint <= 31);
    const isC1Control = codePoint >= 127 && codePoint <= 159;
    if (!isC0Control && !isC1Control) sanitized += character;
  }
  return sanitized;
}

function sanitizePdfLabel(value: string) {
  return sanitizePdfText(value).replaceAll("\n", " ");
}

export type SpendingPdfCapture = {
  capture: SpendingCapture;
  folderName: string;
  tagNames: string[];
  expenses: PdfExpense[];
};

export type SpendingPdfReport = {
  generatedAt: string;
  captures: SpendingPdfCapture[];
  standaloneExpenses: PdfExpense[];
  categories: Array<Pick<PersistedAppData["categories"][number], "id" | "name">>;
  paymentMethods: Array<Pick<PersistedAppData["paymentMethods"][number], "id" | "name">>;
  totalsByCurrency: Array<{ currency: string; amount: number }>;
};

function activeExpenses(data: PersistedAppData) {
  return data.expenses.filter((expense) => !expense.deletedAt).sort((a, b) => a.spentAt.localeCompare(b.spentAt));
}

/** Build a structured report snapshot, keeping captures as context and expenses as the only totals. */
export function buildSpendingPdfReport(data: PersistedAppData, captureId?: string): SpendingPdfReport {
  const activeCaptures = data.spendingCaptures.filter((capture) => !capture.deletedAt);
  const selectedCaptures = captureId
    ? activeCaptures.filter((capture) => capture.id === captureId)
    : activeCaptures.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  if (captureId && selectedCaptures.length === 0) throw new Error("Spending note not found.");

  const expenses = activeExpenses(data);
  const captures = selectedCaptures.map((capture) => {
    const folder = data.spendingFolders.find((item) => item.id === capture.folderId && !item.deletedAt);
    const tagNames = capture.tagIds.flatMap((tagId) => {
      const tag = data.tags.find((item) => item.id === tagId);
      return tag ? [tag.name] : [];
    });
    return {
      capture,
      folderName: folder?.name ?? "Unfiled",
      tagNames,
      expenses: expenses.filter((expense) => expense.captureId === capture.id),
    };
  });

  const activeCaptureIds = new Set(activeCaptures.map((capture) => capture.id));
  const selectedCaptureIds = new Set(selectedCaptures.map((capture) => capture.id));
  const reportExpenses = captureId
    ? expenses.filter((expense) => expense.captureId === captureId)
    : expenses;
  const standaloneExpenses = captureId
    ? []
    : expenses.filter((expense) => !expense.captureId || !activeCaptureIds.has(expense.captureId));
  const totals = new Map<string, number>();
  for (const expense of reportExpenses) {
    if (expense.captureId && activeCaptureIds.has(expense.captureId) && !selectedCaptureIds.has(expense.captureId) && captureId) continue;
    totals.set(expense.currency, (totals.get(expense.currency) ?? 0) + expense.amount);
  }

  return {
    generatedAt: new Date().toISOString(),
    captures,
    standaloneExpenses,
    categories: data.categories.map(({ id, name }) => ({ id, name })),
    paymentMethods: data.paymentMethods.map(({ id, name }) => ({ id, name })),
    totalsByCurrency: [...totals].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => a.currency.localeCompare(b.currency)),
  };
}

function amountText(expense: PdfExpense) {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(expense.amount);
  return `${amount} ${expense.currency}`;
}

function shortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return sanitizePdfText(value);
  return sanitizePdfText(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date));
}

function captureHeading(capture: SpendingCapture) {
  return `Spending note - ${shortDate(capture.capturedAt)}`;
}

function font(doc: jsPDF, style: "normal" | "bold" = "normal", size = 9) {
  doc.setFont("NotoSans", style);
  doc.setFontSize(size);
}

function drawPageHeader(doc: jsPDF, context?: string) {
  font(doc, "bold", 8);
  doc.setTextColor(110, 108, 101);
  doc.text("NOLA - SPENDING REPORT", MARGIN, 27);
  if (context) {
    font(doc, "normal", 8);
    const safeContext = sanitizePdfLabel(context);
    doc.text(doc.splitTextToSize(safeContext, CONTENT_WIDTH), MARGIN, 41, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1 });
  }
  doc.setDrawColor(226, 224, 216);
  doc.line(MARGIN, 48, PAGE_WIDTH - MARGIN, 48);
  doc.setTextColor(25, 25, 24);
}

function addPage(doc: jsPDF, context?: string) {
  doc.addPage();
  drawPageHeader(doc, context);
  return context ? 67 : 58;
}

function sectionHeading(doc: jsPDF, title: string, y: number, context?: string) {
  if (y + 25 > BOTTOM) y = addPage(doc, context ?? title);
  font(doc, "bold", 11);
  doc.setTextColor(25, 25, 24);
  doc.text(sanitizePdfLabel(title), MARGIN, y + 11);
  doc.setTextColor(25, 25, 24);
  return y + 20;
}

function writeParagraph(doc: jsPDF, value: string, y: number, context: string, size = 9) {
  font(doc, "normal", size);
  doc.setTextColor(62, 62, 58);
  const paragraphs = sanitizePdfText(value).split("\n");
  for (const paragraph of paragraphs) {
    const lines = paragraph ? doc.splitTextToSize(paragraph, CONTENT_WIDTH) as string[] : [""];
    for (const line of lines) {
      if (y + LINE_HEIGHT > BOTTOM) y = addPage(doc, `${context} - continued`);
      if (line) doc.text(line, MARGIN, y + 8);
      y += LINE_HEIGHT;
    }
  }
  doc.setTextColor(25, 25, 24);
  return y + 3;
}

type TableColumn = { label: string; width: number; value: (expense: PdfExpense) => string; align?: "right" };

const TABLE_COLUMNS: TableColumn[] = [
  { label: "Date", width: 66, value: (expense) => shortDate(expense.spentAt) },
  { label: "Description", width: 137, value: (expense) => expense.note || "Expense" },
  { label: "Amount", width: 88, value: amountText, align: "right" },
  { label: "Category", width: 73, value: (expense) => "categoryName" in expense ? String(expense.categoryName ?? "") : "" },
  { label: "Payment", width: 76, value: (expense) => "paymentMethodName" in expense ? String(expense.paymentMethodName ?? "") : "" },
  { label: "Qty", width: 25, value: (expense) => expense.quantity === null ? "" : String(expense.quantity), align: "right" },
];

function enrichExpenses(expenses: PdfExpense[], report: SpendingPdfReport) {
  return expenses.map((expense) => ({
    ...expense,
    categoryName: report.categories.find((category) => category.id === expense.categoryId)?.name ?? "",
    paymentMethodName: report.paymentMethods.find((method) => method.id === expense.paymentMethodId)?.name ?? "",
  }));
}

function tableHeader(doc: jsPDF, y: number) {
  font(doc, "bold", 7.5);
  doc.setFillColor(245, 243, 235);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 19, 3, 3, "F");
  let x = MARGIN;
  for (const column of TABLE_COLUMNS) {
    const tx = column.align === "right" ? x + column.width - 5 : x + 5;
    doc.text(column.label, tx, y + 12, column.align === "right" ? { align: "right" } : undefined);
    x += column.width;
  }
  return y + 23;
}

function drawExpenseTable(doc: jsPDF, rawExpenses: PdfExpense[], report: SpendingPdfReport, y: number, context: string) {
  const expenses = enrichExpenses(rawExpenses, report);
  if (expenses.length === 0) return writeParagraph(doc, "No structured expenses", y, context, 8.5);
  y = tableHeader(doc, y);

  for (let index = 0; index < expenses.length; index += 1) {
    const expense = expenses[index] as PdfExpense & { categoryName: string; paymentMethodName: string };
    const cellLines = TABLE_COLUMNS.map((column) => doc.splitTextToSize(sanitizePdfText(column.value(expense)), column.width - 9) as string[]);
    const rowHeight = Math.max(19, ...cellLines.map((lines) => lines.length * 9 + 7));
    if (y + rowHeight > BOTTOM) {
      y = addPage(doc, context);
      y = tableHeader(doc, y);
    }
    if (index % 2 === 1) {
      doc.setFillColor(250, 249, 246);
      doc.rect(MARGIN, y - 2, CONTENT_WIDTH, rowHeight, "F");
    }
    font(doc, "normal", 7.2);
    doc.setTextColor(53, 53, 50);
    let x = MARGIN;
    for (let columnIndex = 0; columnIndex < TABLE_COLUMNS.length; columnIndex += 1) {
      const column = TABLE_COLUMNS[columnIndex];
      const lines = cellLines[columnIndex] ?? [];
      if (column?.align === "right") {
        doc.text(lines, x + column.width - 5, y + 8, { align: "right", lineHeightFactor: 1.15 });
      } else {
        doc.text(lines, x + 5, y + 8, { lineHeightFactor: 1.15 });
      }
      x += column?.width ?? 0;
    }
    doc.setDrawColor(234, 232, 225);
    doc.line(MARGIN, y + rowHeight - 2, PAGE_WIDTH - MARGIN, y + rowHeight - 2);
    y += rowHeight;
  }
  doc.setTextColor(25, 25, 24);
  return y + 8;
}

function sumText(report: SpendingPdfReport) {
  if (report.totalsByCurrency.length === 0) return "No expenses";
  return sanitizePdfLabel(report.totalsByCurrency.map(({ currency, amount }) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ${currency}`).join("   /   "));
}

/** Draws a report into a caller-provided jsPDF instance, useful for browser export and focused tests. */
export function writeSpendingPdfDocument(doc: jsPDF, report: SpendingPdfReport) {
  drawPageHeader(doc);
  let y = 77;
  font(doc, "bold", 22);
  doc.setTextColor(24, 24, 22);
  doc.text("Spending report", MARGIN, y);
  y += 16;
  font(doc, "normal", 8.5);
  doc.setTextColor(112, 110, 103);
  doc.text(`Generated ${shortDate(report.generatedAt)}`, MARGIN, y);
  y += 22;

  y = sectionHeading(doc, "Total spending", y, "Spending report");
  font(doc, "bold", 11);
  doc.setTextColor(187, 148, 32);
  doc.text(sumText(report), MARGIN, y + 10);
  doc.setTextColor(25, 25, 24);
  y += 28;

  for (const { capture, folderName, tagNames, expenses } of report.captures) {
    const title = captureHeading(capture);
    const context = `${title} - ${folderName}`;
    y = sectionHeading(doc, title, y, context);
    font(doc, "normal", 8);
    doc.setTextColor(108, 106, 100);
    doc.text(sanitizePdfLabel(`Folder: ${folderName}${tagNames.length ? `   Tags: ${tagNames.join(", ")}` : ""}`), MARGIN, y + 7);
    doc.setTextColor(25, 25, 24);
    y += 15;

    y = sectionHeading(doc, "Original text", y, `${context} - Original text`);
    y = writeParagraph(doc, capture.sourceText, y, `${context} - Original text`);
    y = sectionHeading(doc, "Expenses", y, `${context} - Expenses`);
    y = drawExpenseTable(doc, expenses, report, y, `${context} - Expenses`);
    y += 9;
  }

  if (report.standaloneExpenses.length > 0) {
    y = sectionHeading(doc, "Standalone expenses", y, "Standalone expenses");
    y = drawExpenseTable(doc, report.standaloneExpenses, report, y, "Standalone expenses");
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 224, 216);
    doc.line(MARGIN, PAGE_HEIGHT - 31, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 31);
    font(doc, "normal", 7.5);
    doc.setTextColor(128, 126, 120);
    doc.text("Nola", MARGIN, PAGE_HEIGHT - 18);
    doc.text(`${page} / ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 18, { align: "right" });
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function loadFont(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load Nola PDF font (${response.status}).`);
  return arrayBufferToBase64(await response.arrayBuffer());
}

/** Creates and downloads an all-data or capture-specific report entirely in the browser. */
export async function exportSpendingPdf(data: PersistedAppData, captureId?: string) {
  const report = buildSpendingPdfReport(data, captureId);
  const [{ jsPDF }, regularFont, boldFont] = await Promise.all([
    import("jspdf"),
    loadFont("/fonts/NotoSans-Regular.ttf"),
    loadFont("/fonts/NotoSans-Bold.ttf"),
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", regularFont);
  doc.addFileToVFS("NotoSans-Bold.ttf", boldFont);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  writeSpendingPdfDocument(doc, report);
  doc.save("nola-spending.pdf");
}
