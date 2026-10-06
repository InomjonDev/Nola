import type { PersistedAppData } from "./types.ts";

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  const safe = typeof value === "string" && /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportWalletlyData(data: PersistedAppData, format: "json" | "csv") {
  const expenses = data.expenses.filter((item) => !item.deletedAt).sort((a, b) => b.spentAt.localeCompare(a.spentAt));
  const incomeEntries = data.incomeEntries.filter((item) => !item.deletedAt);
  const budgets = data.budgets.filter((item) => !item.deletedAt);
  const savingsGoals = data.savingsGoals.filter((item) => !item.deletedAt);
  const goalIds = new Set(savingsGoals.map((goal) => goal.id));
  const goalContributions = data.goalContributions.filter((item) => !item.deletedAt && goalIds.has(item.goalId));
  if (format === "json") return JSON.stringify({ profile: data.profile, categories: data.categories, paymentMethods: data.paymentMethods, tags: data.tags, expenses, incomeEntries, budgets, savingsGoals, goalContributions }, null, 2);

  const header = ["type", "id", "amount", "currency", "date", "category", "note", "month", "goal_id", "name", "target_amount", "deadline", "archived_at", "icon", "kind"];
  const rows: Array<Array<string | number | null>> = [
    ...expenses.map((item) => ["expense", item.id, item.amount, item.currency, item.spentAt, data.categories.find((category) => category.id === item.categoryId)?.name ?? "", item.note, "", "", "", "", "", "", "", ""]),
    ...incomeEntries.map((item) => ["income", item.id, item.amount, item.currency, item.receivedAt, "", item.note, "", "", "", "", "", "", "", ""]),
    ...budgets.map((item) => ["budget", item.id, item.amount, item.currency, "", "", "", item.month, "", "", "", "", "", "", ""]),
    ...savingsGoals.map((item) => ["savings_goal", item.id, "", item.currency, "", "", "", "", "", item.name, item.targetAmount, item.deadline, item.archivedAt, item.icon, ""]),
    ...goalContributions.map((item) => ["goal_contribution", item.id, item.amount, item.currency, item.occurredOn, "", item.note, "", item.goalId, "", "", "", "", "", item.kind]),
  ];
  return [header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}
