export type ThemeMode = "system" | "light" | "dark";
export type Language = "en" | "ru" | "uz";
export type CategoryIconName =
  | "utensils"
  | "car"
  | "receipt"
  | "shopping-bag"
  | "clapperboard"
  | "dumbbell"
  | "heart-pulse"
  | "home"
  | "plane"
  | "briefcase"
  | "gift"
  | "coffee"
  | "fuel"
  | "ticket"
  | "wallet"
  | "more-horizontal";
export type ConsentRecord = {
  accepted: boolean;
  ageConfirmed: boolean;
  acceptedAt: string;
};

export type UserIdentity = {
  id: string;
  email: string | null;
  isDemo: boolean;
  name?: string | null;
  provider?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
};

export type Profile = {
  userId: string;
  currency: string;
  defaultPaymentMethodId: string;
  onboardingCompleted: boolean;
};

export type Category = {
  id: string;
  userId: string | null;
  name: string;
  color: string;
  icon?: CategoryIconName;
  kind: "global" | "custom";
  archivedAt: string | null;
  updatedAt: string;
};

export type PaymentMethod = {
  id: string;
  userId: string;
  name: string;
  archivedAt: string | null;
  updatedAt: string;
};

export type Tag = {
  id: string;
  userId: string;
  name: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  spentAt: string;
  categoryId: string;
  paymentMethodId: string;
  note: string;
  recurringRuleId?: string | null;
  tagIds: string[];
  deletedAt: string | null;
  updatedAt: string;
};

export type ExpenseDraft = Omit<Expense, "id" | "userId" | "currency" | "deletedAt" | "updatedAt"> & {
  currency?: string;
};

export type IncomeEntry = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  accountId?: string | null;
  recurringRuleId?: string | null;
  receivedAt: string;
  note: string;
  deletedAt: string | null;
  updatedAt: string;
};

export type IncomeEntryDraft = Omit<IncomeEntry, "id" | "userId" | "deletedAt" | "updatedAt">;

export type Budget = {
  id: string;
  userId: string;
  month: string;
  amount: number;
  currency: string;
  deletedAt: string | null;
  updatedAt: string;
};

export type BudgetDraft = Omit<Budget, "id" | "userId" | "deletedAt" | "updatedAt">;

export type BudgetCadence = "weekly" | "monthly";

export type CategoryBudget = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  cadence: BudgetCadence;
  deletedAt: string | null;
  updatedAt: string;
};

export type CategoryBudgetDraft = Pick<CategoryBudget, "categoryId" | "amount" | "currency" | "cadence">;

export type RecurringFrequency = "weekly" | "monthly";

export type RecurringRule = {
  id: string;
  userId: string;
  kind: "expense" | "income";
  amount: number;
  currency: string;
  accountId: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  note: string;
  tagIds: string[];
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  archivedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type RecurringRuleDraft = Pick<RecurringRule, "kind" | "amount" | "currency" | "accountId" | "categoryId" | "paymentMethodId" | "note" | "tagIds" | "frequency" | "startDate">;

export type Account = {
  id: string;
  userId: string;
  name: string;
  kind: "cash" | "bank" | "card";
  currency: string;
  startingBalance: number;
  archivedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type AccountDraft = Pick<Account, "name" | "kind" | "currency" | "startingBalance">;

export type AccountAdjustment = {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  occurredOn: string;
  note: string;
  deletedAt: string | null;
  updatedAt: string;
};

export type AccountAdjustmentDraft = Pick<AccountAdjustment, "accountId" | "amount" | "currency" | "occurredOn" | "note">;

export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currency: string;
  icon: "wallet" | "plane" | "home" | "car" | "gift" | "briefcase" | "heart-pulse" | "shopping-bag";
  deadline: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type SavingsGoalDraft = Pick<SavingsGoal, "name" | "targetAmount" | "currency" | "icon" | "deadline">;

export type GoalContribution = {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  currency: string;
  kind: "deposit" | "withdrawal";
  occurredOn: string;
  note: string;
  deletedAt: string | null;
  updatedAt: string;
};

export type GoalContributionDraft = Pick<GoalContribution, "goalId" | "amount" | "kind" | "occurredOn" | "note">;

export type SyncOperation = {
  id: string;
  table: "profiles" | "categories" | "payment_methods" | "tags" | "expenses" | "income_entries" | "budgets" | "savings_goals" | "goal_contributions" | "category_budgets" | "recurring_rules" | "accounts" | "account_adjustments";
  action: "upsert" | "delete";
  recordId: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type PersistedAppData = {
  profile: Profile | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  tags: Tag[];
  expenses: Expense[];
  incomeEntries: IncomeEntry[];
  budgets: Budget[];
  categoryBudgets: CategoryBudget[];
  recurringRules: RecurringRule[];
  accounts: Account[];
  accountAdjustments: AccountAdjustment[];
  savingsGoals: SavingsGoal[];
  goalContributions: GoalContribution[];
  syncQueue: SyncOperation[];
};
