import type { Expense, PersistedAppData, SpendingCapture } from "./types.ts";

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  const safe = typeof value === "string" && /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function markdownText(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\r\n", "<br>")
    .replaceAll("\n", "<br>")
    .replaceAll("\r", "<br>");
}

function codeFenceFor(value: string) {
  const runs = value.match(/`+/g) ?? [];
  const longestRun = runs.reduce((longest, run) => Math.max(longest, run.length), 0);
  return "`".repeat(Math.max(3, longestRun + 1));
}

function expenseDescription(expense: Expense) {
  return expense.note || "Expense";
}

function captureMarkdown(capture: SpendingCapture, data: PersistedAppData, expenses: Expense[]) {
  const folder = data.spendingFolders.find((item) => item.id === capture.folderId && !item.deletedAt);
  const tagsById = new Map(data.tags.map((tag) => [tag.id, tag]));
  const captureTags = capture.tagIds.flatMap((tagId) => {
    const tag = tagsById.get(tagId);
    return tag ? [tag.name] : [];
  });
  const linkedExpenses = expenses.filter((expense) => expense.captureId === capture.id && !expense.deletedAt);
  const fence = codeFenceFor(capture.sourceText);
  const rows = linkedExpenses.map((expense) => {
    const category = data.categories.find((item) => item.id === expense.categoryId)?.name ?? "";
    const paymentMethod = data.paymentMethods.find((item) => item.id === expense.paymentMethodId)?.name ?? "";
    const expenseTags = expense.tagIds.flatMap((tagId) => {
      const tag = tagsById.get(tagId);
      return tag ? [tag.name] : [];
    }).join(", ");
    return `| ${markdownText(expense.spentAt)} | ${markdownText(expenseDescription(expense))} | ${markdownText(`${expense.amount} ${expense.currency}`)} | ${markdownText(category)} | ${markdownText(paymentMethod)} | ${markdownText(expense.quantity)} | ${markdownText(expenseTags)} |`;
  });

  return [
    `## Spending note · ${markdownText(capture.capturedAt)}`,
    "",
    `- Captured: ${markdownText(capture.capturedAt)}`,
    `- Folder: ${markdownText(folder?.name ?? "Unfiled")}`,
    `- Tags: ${markdownText(captureTags.join(", ") || "None")}`,
    "",
    "### Original text",
    "",
    fence,
    capture.sourceText,
    fence,
    "",
    "### Expenses",
    "",
    "| Date | Description | Amount | Category | Payment method | Quantity | Tags |",
    "| --- | --- | ---: | --- | --- | ---: | --- |",
    ...(rows.length ? rows : ["| — | No structured expenses | — | — | — | — | — |"]),
  ].join("\n");
}

export function exportNolaData(data: PersistedAppData, format: "json" | "csv" | "markdown") {
  const expenses = data.expenses.filter((item) => !item.deletedAt).sort((a, b) => b.spentAt.localeCompare(a.spentAt));
  const incomeEntries = data.incomeEntries.filter((item) => !item.deletedAt);
  const budgets = data.budgets.filter((item) => !item.deletedAt);
  const savingsGoals = data.savingsGoals.filter((item) => !item.deletedAt);
  const spendingCaptures = data.spendingCaptures.filter((item) => !item.deletedAt).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const spendingFolders = data.spendingFolders.filter((item) => !item.deletedAt);
  const goalIds = new Set(savingsGoals.map((goal) => goal.id));
  const goalContributions = data.goalContributions.filter((item) => !item.deletedAt && goalIds.has(item.goalId));

  if (format === "json") {
    return JSON.stringify({ profile: data.profile, categories: data.categories, paymentMethods: data.paymentMethods, tags: data.tags, expenses, spendingCaptures, spendingFolders, incomeEntries, budgets, savingsGoals, goalContributions }, null, 2);
  }

  if (format === "markdown") {
    const captures = spendingCaptures.map((capture) => captureMarkdown(capture, data, expenses));
    const activeCaptureIds = new Set(spendingCaptures.map((capture) => capture.id));
    const standaloneExpenses = expenses.filter((expense) => !expense.captureId || !activeCaptureIds.has(expense.captureId));
    const standaloneRows = standaloneExpenses.map((expense) => {
      const category = data.categories.find((item) => item.id === expense.categoryId)?.name ?? "";
      return `| ${markdownText(expense.spentAt)} | ${markdownText(expenseDescription(expense))} | ${markdownText(`${expense.amount} ${expense.currency}`)} | ${markdownText(category)} | ${markdownText(expense.quantity)} |`;
    });
    if (standaloneExpenses.length) {
      captures.push([
        "## Standalone expenses",
        "",
        "| Date | Description | Amount | Category | Quantity |",
        "| --- | --- | ---: | --- | ---: |",
        ...standaloneRows,
      ].join("\n"));
    }
    return ["# Nola spending export", "", ...captures].join("\n\n");
  }

  const header = ["type", "id", "amount", "currency", "date", "category", "note", "month", "goal_id", "name", "target_amount", "deadline", "archived_at", "icon", "kind", "capture_id", "quantity"];
  const rows: Array<Array<string | number | null>> = [
    ...expenses.map((item) => ["expense", item.id, item.amount, item.currency, item.spentAt, data.categories.find((category) => category.id === item.categoryId)?.name ?? "", item.note, "", "", "", "", "", "", "", "", item.captureId, item.quantity]),
    ...incomeEntries.map((item) => ["income", item.id, item.amount, item.currency, item.receivedAt, "", item.note, "", "", "", "", "", "", "", "", "", ""]),
    ...budgets.map((item) => ["budget", item.id, item.amount, item.currency, "", "", "", item.month, "", "", "", "", "", "", "", "", ""]),
    ...savingsGoals.map((item) => ["savings_goal", item.id, "", item.currency, "", "", "", "", "", item.name, item.targetAmount, item.deadline, item.archivedAt, item.icon, "", "", ""]),
    ...goalContributions.map((item) => ["goal_contribution", item.id, item.amount, item.currency, item.occurredOn, "", item.note, "", item.goalId, "", "", "", "", "", item.kind, "", ""]),
  ];
  return [header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}
