import { DEFAULT_PAYMENT_METHODS, GLOBAL_CATEGORIES } from "./constants.ts";
import { createId } from "./id.ts";
import type { PersistedAppData } from "./types.ts";

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createDemoData(userId: string, currency: string, paymentMethodName: string): PersistedAppData {
  const now = new Date();
  const iso = now.toISOString();
  const paymentMethods = DEFAULT_PAYMENT_METHODS.map((name) => ({ id: createId(), userId, name, archivedAt: null, updatedAt: iso }));
  const selectedMethod = paymentMethods.find((method) => method.name === paymentMethodName) ?? paymentMethods[0];
  const tag = { id: createId(), userId, name: "daily", updatedAt: iso };
  const accountKinds = ["card", "cash", "bank"] as const;
  const accounts = paymentMethods.map((method, index) => ({
    id: method.id,
    userId,
    name: method.name,
    kind: accountKinds[index],
    currency,
    startingBalance: index === 1 ? 40 : 0,
    archivedAt: null,
    deletedAt: null,
    updatedAt: iso,
  }));
  const goalId = createId();
  const food = GLOBAL_CATEGORIES[0]?.id ?? "00000000-0000-4000-8000-000000000001";
  const transport = GLOBAL_CATEGORIES[1]?.id ?? "00000000-0000-4000-8000-000000000002";
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = dateKey(now);
  const nextRunDate = dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  return {
    profile: { userId, currency, defaultPaymentMethodId: selectedMethod.id, onboardingCompleted: true },
    categories: [...GLOBAL_CATEGORIES],
    paymentMethods,
    tags: [tag],
    expenses: [
      { id: createId(), userId, amount: 4.5, currency, spentAt: dateDaysAgo(0), categoryId: food, paymentMethodId: paymentMethods[0].id, note: "Coffee", tagIds: [tag.id], deletedAt: null, updatedAt: iso },
      { id: createId(), userId, amount: 12, currency, spentAt: dateDaysAgo(1), categoryId: transport, paymentMethodId: paymentMethods[1].id, note: "Transport", tagIds: [], deletedAt: null, updatedAt: iso },
      { id: createId(), userId, amount: 34.8, currency, spentAt: dateDaysAgo(2), categoryId: food, paymentMethodId: paymentMethods[0].id, note: "Groceries", tagIds: [tag.id], deletedAt: null, updatedAt: iso },
    ],
    incomeEntries: [{ id: createId(), userId, amount: 1800, currency, accountId: selectedMethod.id, receivedAt: iso, note: "Monthly income", deletedAt: null, updatedAt: iso }],
    budgets: [{ id: createId(), userId, month, amount: 900, currency, deletedAt: null, updatedAt: iso }],
    categoryBudgets: [
      { id: createId(), userId, categoryId: food, amount: 220, currency, cadence: "monthly", deletedAt: null, updatedAt: iso },
      { id: createId(), userId, categoryId: transport, amount: 60, currency, cadence: "weekly", deletedAt: null, updatedAt: iso },
    ],
    recurringRules: [{ id: createId(), userId, kind: "expense", amount: 12, currency, accountId: null, categoryId: food, paymentMethodId: paymentMethods[0].id, note: "Monthly subscription", tagIds: [], frequency: "monthly", startDate: nextRunDate, nextRunDate, archivedAt: null, deletedAt: null, updatedAt: iso }],
    accounts,
    accountAdjustments: [],
    savingsGoals: [{ id: goalId, userId, name: "Future plans", targetAmount: 500, currency, icon: "wallet", deadline: null, archivedAt: null, deletedAt: null, updatedAt: iso }],
    goalContributions: [{ id: createId(), goalId, userId, amount: 125, currency, kind: "deposit", occurredOn: today, note: "First savings", deletedAt: null, updatedAt: iso }],
    syncQueue: [],
  };
}
