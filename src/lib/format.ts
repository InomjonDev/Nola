import type { Expense } from "@/lib/types";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number, currency: string, locale?: string) {
  const key = `${locale ?? "default"}:${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: currency === "UZS" || currency === "JPY" ? 0 : 2 });
    currencyFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

export function formatExpenseDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value));
}

export function isThisMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function isThisWeek(value: string) {
  const now = new Date();
  const date = new Date(value);
  const start = new Date(now);
  const end = new Date(now);
  const day = (now.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

export function activeExpenses(expenses: Expense[]) {
  return expenses.filter((expense) => !expense.deletedAt);
}

export function primaryCurrency(expenses: Expense[], fallback: string) {
  if (!expenses.length || expenses.some((expense) => expense.currency === fallback)) return fallback;
  return expenses[0].currency || fallback;
}

export function expensesInCurrency(expenses: Expense[], currency: string) {
  return expenses.filter((expense) => expense.currency === currency);
}
