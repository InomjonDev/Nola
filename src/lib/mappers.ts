import type { Category, Expense, PaymentMethod, Profile, Tag } from "@/lib/types";

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
  tag_ids: item.tagIds,
  deleted_at: item.deletedAt,
  client_updated_at: item.updatedAt,
  updated_at: item.updatedAt,
});
