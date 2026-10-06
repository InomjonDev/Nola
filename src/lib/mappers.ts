import type { Account, AccountAdjustment, Budget, Category, CategoryBudget, Expense, GoalContribution, IncomeEntry, PaymentMethod, Profile, RecurringRule, SavingsGoal, Tag } from "@/lib/types";

type Row = Record<string, unknown>;

export const toProfile = (row: Row): Profile => ({
  userId: row.id as string,
  currency: row.currency as string,
  defaultPaymentMethodId: row.default_payment_method_id as string,
  onboardingCompleted: Boolean(row.onboarding_completed),
});

export const profileRow = (profile: Profile) => ({
  id: profile.userId,
  currency: profile.currency,
  default_payment_method_id: profile.defaultPaymentMethodId,
  onboarding_completed: profile.onboardingCompleted,
  updated_at: new Date().toISOString(),
});

export const toCategory = (row: Row): Category => ({
  id: row.id as string,
  userId: (row.user_id as string | null) ?? null,
  name: row.name as string,
  color: row.color as string,
  icon: typeof row.icon === "string" ? row.icon as Category["icon"] : undefined,
  kind: row.kind as Category["kind"],
  archivedAt: (row.archived_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const categoryRow = (item: Category) => ({ id: item.id, user_id: item.userId, name: item.name, color: item.color, icon: item.icon ?? null, kind: item.kind, archived_at: item.archivedAt, client_updated_at: item.updatedAt, updated_at: item.updatedAt });

export const toPaymentMethod = (row: Row): PaymentMethod => ({ id: row.id as string, userId: row.user_id as string, name: row.name as string, archivedAt: (row.archived_at as string | null) ?? null, updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string) });
export const paymentMethodRow = (item: PaymentMethod) => ({ id: item.id, user_id: item.userId, name: item.name, archived_at: item.archivedAt, client_updated_at: item.updatedAt, updated_at: item.updatedAt });

export const toTag = (row: Row): Tag => ({ id: row.id as string, userId: row.user_id as string, name: row.name as string, updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string) });
export const tagRow = (item: Tag) => ({ id: item.id, user_id: item.userId, name: item.name, client_updated_at: item.updatedAt, updated_at: item.updatedAt });

export const toExpense = (row: Row): Expense => ({
  id: row.id as string,
  userId: row.user_id as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  spentAt: row.spent_at as string,
  categoryId: row.category_id as string,
  paymentMethodId: row.payment_method_id as string,
  note: (row.note as string | null) ?? "",
  recurringRuleId: (row.recurring_rule_id as string | null) ?? null,
  tagIds: (row.tag_ids as string[] | null) ?? [],
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const expenseRow = (item: Expense) => ({
  id: item.id,
  user_id: item.userId,
  amount: item.amount,
  currency: item.currency,
  spent_at: item.spentAt,
  category_id: item.categoryId,
  payment_method_id: item.paymentMethodId,
  note: item.note || null,
  recurring_rule_id: item.recurringRuleId ?? null,
  tag_ids: item.tagIds,
  deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt,
  updated_at: item.updatedAt,
});

export const toIncomeEntry = (row: Row): IncomeEntry => ({
  id: row.id as string,
  userId: row.user_id as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  accountId: (row.account_id as string | null) ?? null,
  recurringRuleId: (row.recurring_rule_id as string | null) ?? null,
  receivedAt: row.received_at as string,
  note: (row.note as string | null) ?? "",
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const incomeEntryRow = (item: IncomeEntry) => ({
  id: item.id,
  user_id: item.userId,
  amount: item.amount,
  currency: item.currency,
  account_id: item.accountId ?? null,
  recurring_rule_id: item.recurringRuleId ?? null,
  received_at: item.receivedAt,
  note: item.note || null,
  deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt,
  updated_at: item.updatedAt,
});

export const toBudget = (row: Row): Budget => ({
  id: row.id as string,
  userId: row.user_id as string,
  month: row.month as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const budgetRow = (item: Budget) => ({
  id: item.id,
  user_id: item.userId,
  month: item.month,
  amount: item.amount,
  currency: item.currency,
  deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt,
  updated_at: item.updatedAt,
});

export const toCategoryBudget = (row: Row): CategoryBudget => ({
  id: row.id as string,
  userId: row.user_id as string,
  categoryId: row.category_id as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  cadence: row.cadence as CategoryBudget["cadence"],
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const categoryBudgetRow = (item: CategoryBudget) => ({
  id: item.id, user_id: item.userId, category_id: item.categoryId, amount: item.amount,
  currency: item.currency, cadence: item.cadence, deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt, updated_at: item.updatedAt,
});

export const toAccount = (row: Row): Account => ({
  id: row.id as string,
  userId: row.user_id as string,
  name: row.name as string,
  kind: row.kind as Account["kind"],
  currency: row.currency as string,
  startingBalance: Number(row.starting_balance),
  archivedAt: (row.archived_at as string | null) ?? null,
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const accountRow = (item: Account) => ({
  id: item.id, user_id: item.userId, name: item.name, kind: item.kind,
  currency: item.currency, starting_balance: item.startingBalance, archived_at: item.archivedAt,
  deleted_at: item.deletedAt, client_updated_at: item.updatedAt, updated_at: item.updatedAt,
});

export const toAccountAdjustment = (row: Row): AccountAdjustment => ({
  id: row.id as string,
  accountId: row.account_id as string,
  userId: row.user_id as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  occurredOn: row.occurred_on as string,
  note: (row.note as string | null) ?? "",
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const accountAdjustmentRow = (item: AccountAdjustment) => ({
  id: item.id, account_id: item.accountId, user_id: item.userId, amount: item.amount,
  currency: item.currency, occurred_on: item.occurredOn, note: item.note || null,
  deleted_at: item.deletedAt, client_updated_at: item.updatedAt, updated_at: item.updatedAt,
});

export const toRecurringRule = (row: Row): RecurringRule => ({
  id: row.id as string,
  userId: row.user_id as string,
  kind: row.kind as RecurringRule["kind"],
  amount: Number(row.amount),
  currency: row.currency as string,
  accountId: (row.account_id as string | null) ?? null,
  categoryId: (row.category_id as string | null) ?? null,
  paymentMethodId: (row.payment_method_id as string | null) ?? null,
  note: (row.note as string | null) ?? "",
  tagIds: (row.tag_ids as string[] | null) ?? [],
  frequency: row.frequency as RecurringRule["frequency"],
  startDate: row.start_date as string,
  nextRunDate: row.next_run_date as string,
  archivedAt: (row.archived_at as string | null) ?? null,
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const recurringRuleRow = (item: RecurringRule) => ({
  id: item.id, user_id: item.userId, kind: item.kind, amount: item.amount, currency: item.currency,
  account_id: item.accountId, category_id: item.categoryId, payment_method_id: item.paymentMethodId,
  note: item.note || null, tag_ids: item.tagIds, frequency: item.frequency, start_date: item.startDate,
  next_run_date: item.nextRunDate, archived_at: item.archivedAt, deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt, updated_at: item.updatedAt,
});

export const toSavingsGoal = (row: Row): SavingsGoal => ({
  id: row.id as string,
  userId: row.user_id as string,
  name: row.name as string,
  targetAmount: Number(row.target_amount),
  currency: row.currency as string,
  icon: row.icon as SavingsGoal["icon"],
  deadline: (row.deadline as string | null) ?? null,
  archivedAt: (row.archived_at as string | null) ?? null,
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const savingsGoalRow = (item: SavingsGoal) => ({
  id: item.id, user_id: item.userId, name: item.name, target_amount: item.targetAmount,
  currency: item.currency, icon: item.icon, deadline: item.deadline, archived_at: item.archivedAt,
  deleted_at: item.deletedAt, client_updated_at: item.updatedAt, updated_at: item.updatedAt,
});

export const toGoalContribution = (row: Row): GoalContribution => ({
  id: row.id as string,
  goalId: row.goal_id as string,
  userId: row.user_id as string,
  amount: Number(row.amount),
  currency: row.currency as string,
  kind: row.kind as GoalContribution["kind"],
  occurredOn: row.occurred_on as string,
  note: (row.note as string | null) ?? "",
  deletedAt: (row.deleted_at as string | null) ?? null,
  updatedAt: (row.client_updated_at as string) ?? (row.updated_at as string),
});

export const goalContributionRow = (item: GoalContribution) => ({
  id: item.id, goal_id: item.goalId, user_id: item.userId, amount: item.amount,
  currency: item.currency, kind: item.kind, occurred_on: item.occurredOn, note: item.note || null,
  deleted_at: item.deletedAt, client_updated_at: item.updatedAt, updated_at: item.updatedAt,
});
