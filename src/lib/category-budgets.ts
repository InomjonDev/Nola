import { WALLETLY_CURRENCIES } from "./constants.ts";
import { monthKey } from "./budgeting.ts";
import { parseAmountValue } from "./currency-input.ts";
import type { Category, CategoryBudget, CategoryBudgetDraft, Expense } from "./types.ts";

export type CategoryBudgetError = "categoryBudgets.categoryError" | "categoryBudgets.amountError" | "categoryBudgets.currencyError" | "categoryBudgets.cadenceError";

function calendarDay(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.slice(0, 10);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isoWeekKey(value: string | Date) {
  const day = calendarDay(value);
  if (!day) return null;
  const date = new Date(`${day}T12:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset + 3);
  const weekYear = date.getUTCFullYear();
  const jan4 = new Date(Date.UTC(weekYear, 0, 4));
  const firstMonday = new Date(Date.UTC(weekYear, 0, 4 - ((jan4.getUTCDay() + 6) % 7)));
  const week = 1 + Math.floor((date.getTime() - firstMonday.getTime()) / 604_800_000);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export function validateCategoryBudget(draft: CategoryBudgetDraft, categories: Category[]): CategoryBudgetError | null {
  if (!categories.some((category) => category.id === draft.categoryId && !category.archivedAt)) return "categoryBudgets.categoryError";
  if (parseAmountValue(String(draft.amount)) === null) return "categoryBudgets.amountError";
  if (!(WALLETLY_CURRENCIES as readonly string[]).includes(draft.currency)) return "categoryBudgets.currencyError";
  if (draft.cadence !== "weekly" && draft.cadence !== "monthly") return "categoryBudgets.cadenceError";
  return null;
}

export function categoryBudgetStatus(budget: CategoryBudget, expenses: Expense[], today: string | Date) {
  const periodLabel = budget.cadence === "weekly" ? isoWeekKey(today) : monthKey(today);
  const spent = expenses
    .filter((expense) => !expense.deletedAt && expense.categoryId === budget.categoryId && expense.currency === budget.currency)
    .filter((expense) => (budget.cadence === "weekly" ? isoWeekKey(expense.spentAt) : monthKey(expense.spentAt)) === periodLabel)
    .reduce((total, expense) => total + Math.round(expense.amount * 100), 0) / 100;
  return { spent, remaining: budget.amount - spent, percentage: Math.round(spent / budget.amount * 10_000) / 100, periodLabel };
}
