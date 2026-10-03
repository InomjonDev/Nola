import type { Budget, Expense, IncomeEntry } from "@/lib/types";

export function monthKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function activeIncome(entries: IncomeEntry[], currency: string, month: string) {
  return entries.filter((entry) => !entry.deletedAt && entry.currency === currency && monthKey(entry.receivedAt) === month);
}

export function activeExpenses(expenses: Expense[], currency: string, month: string) {
  return expenses.filter((expense) => !expense.deletedAt && expense.currency === currency && monthKey(expense.spentAt) === month);
}

export function activeBudget(budgets: Budget[], currency: string, month: string) {
  return budgets.find((budget) => !budget.deletedAt && budget.currency === currency && budget.month === month) ?? null;
}

export function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}

export function remainingBudget(budgets: Budget[], expenses: Expense[], currency: string, month: string) {
  const budget = activeBudget(budgets, currency, month);
  return budget ? budget.amount - sumAmounts(activeExpenses(expenses, currency, month)) : null;
}
