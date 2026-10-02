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
  tagIds: string[];
  deletedAt: string | null;
  updatedAt: string;
};

export type ExpenseDraft = Omit<Expense, "id" | "userId" | "currency" | "deletedAt" | "updatedAt"> & {
  currency?: string;
};

export type SyncOperation = {
  id: string;
  table: "profiles" | "categories" | "payment_methods" | "tags" | "expenses";
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
  syncQueue: SyncOperation[];
};
