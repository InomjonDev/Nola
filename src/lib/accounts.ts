import type { Account, AccountAdjustment, Expense, IncomeEntry } from "./types.ts";

export function accountBalance(account: Account, expenses: Expense[], incomeEntries: IncomeEntry[], adjustments: AccountAdjustment[]) {
  const spent = expenses
    .filter((item) => item.userId === account.userId && !item.deletedAt && item.paymentMethodId === account.id && item.currency === account.currency)
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const income = incomeEntries
    .filter((item) => item.userId === account.userId && !item.deletedAt && item.accountId === account.id && item.currency === account.currency)
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const adjusted = adjustments
    .filter((item) => item.userId === account.userId && !item.deletedAt && item.accountId === account.id && item.currency === account.currency)
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  return (Math.round(account.startingBalance * 100) + income - spent + adjusted) / 100;
}
