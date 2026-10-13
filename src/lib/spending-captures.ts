import type { Expense, ParsedCaptureItem, SpendingCapture, SpendingFolder, Tag } from "./types.ts";

export type SpendingCaptureData = {
  spendingCaptures: SpendingCapture[];
  expenses: Expense[];
};

export function filterOwnedTagIds(tagIds: string[], tags: Pick<Tag, "id" | "userId">[], userId: string) {
  const ownedTagIds = new Set(tags.filter((tag) => tag.userId === userId).map((tag) => tag.id));
  return [...new Set(tagIds.filter((id) => ownedTagIds.has(id)))];
}

export function hasActiveFolderName(folders: Pick<SpendingFolder, "id" | "userId" | "name" | "deletedAt">[], name: string, userId: string, excludingId?: string) {
  const normalizedName = name.trim().toLowerCase();
  return folders.some((folder) => folder.userId === userId && !folder.deletedAt && folder.id !== excludingId && folder.name.trim().toLowerCase() === normalizedName);
}

export function captureTotal(expenses: Pick<Expense, "captureId" | "amount" | "currency" | "deletedAt">[], captureId: string, currency: string) {
  return expenses.reduce((total, expense) => (
    expense.captureId === captureId && expense.currency === currency && !expense.deletedAt
      ? total + expense.amount
      : total
  ), 0);
}

export function undoCaptureData<T extends SpendingCaptureData>(data: T, captureId: string, deletedAt: string): T {
  const capture = data.spendingCaptures.find((item) => item.id === captureId);
  if (!capture || capture.deletedAt) return data;

  return {
    ...data,
    spendingCaptures: data.spendingCaptures.map((item) => item.id === captureId
      ? { ...item, deletedAt, parseStatus: "undone", updatedAt: deletedAt }
      : item),
    expenses: data.expenses.map((item) => item.captureId === captureId && !item.deletedAt
      ? { ...item, deletedAt, updatedAt: deletedAt }
      : item),
  };
}

export function editCaptureTextData<T extends SpendingCaptureData>(data: T, captureId: string, sourceText: string, updatedAt = new Date().toISOString(), tagIds?: string[]): T {
  const capture = data.spendingCaptures.find((item) => item.id === captureId);
  if (!capture || capture.deletedAt || !sourceText.trim() || sourceText.length > 4000) return data;

  return {
    ...data,
    spendingCaptures: data.spendingCaptures.map((item) => item.id === captureId
      ? { ...item, sourceText, ...(tagIds ? { tagIds } : {}), parseStatus: "pending", parseRevision: item.parseRevision + 1, updatedAt }
      : item),
  };
}

function isParsedCaptureItem(value: unknown): value is ParsedCaptureItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ParsedCaptureItem>;
  return typeof item.id === "string" && item.id.trim().length > 0
    && typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0
    && typeof item.currency === "string" && item.currency.trim().length > 0
    && typeof item.description === "string" && item.description.trim().length > 0 && item.description.length <= 160
    && (item.quantity === null || (typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0))
    && typeof item.spentAt === "string" && Number.isFinite(Date.parse(item.spentAt))
    && typeof item.categoryId === "string" && item.categoryId.trim().length > 0
    && typeof item.paymentMethodId === "string" && item.paymentMethodId.trim().length > 0
    && Array.isArray(item.tagIds) && item.tagIds.every((tagId) => typeof tagId === "string");
}

function validParsedCaptureItems(items: unknown): items is ParsedCaptureItem[] {
  if (!Array.isArray(items) || items.length === 0 || !items.every(isParsedCaptureItem)) return false;
  const ids = new Set(items.map((item) => item.id));
  return ids.size === items.length;
}

export function applyCaptureParseData<T extends SpendingCaptureData>(
  data: T,
  captureId: string,
  parseRevision: number,
  items: unknown,
  updatedAt = new Date().toISOString(),
): T {
  const capture = data.spendingCaptures.find((item) => item.id === captureId);
  if (!capture || capture.deletedAt || capture.parseStatus === "undone" || capture.parseRevision !== parseRevision || capture.parsedRevision === parseRevision || !validParsedCaptureItems(items)) return data;

  const itemIds = new Set(items.map((item) => item.id));
  if (data.expenses.some((expense) => itemIds.has(expense.id))) return data;

  const parsedItems = items.map((item) => ({ ...item, tagIds: [...capture.tagIds] }));
  const replacedExpenses = data.expenses.map((expense) => expense.captureId === captureId && !expense.deletedAt
    ? { ...expense, deletedAt: updatedAt, updatedAt }
    : expense);
  const newExpenses: Expense[] = parsedItems.map((item) => ({
    id: item.id,
    userId: capture.userId,
    amount: item.amount,
    currency: item.currency,
    spentAt: item.spentAt,
    categoryId: item.categoryId,
    paymentMethodId: item.paymentMethodId,
    captureId,
    quantity: item.quantity,
    note: item.description,
    recurringRuleId: null,
    tagIds: [...item.tagIds],
    deletedAt: null,
    updatedAt,
  }));

  return {
    ...data,
    spendingCaptures: data.spendingCaptures.map((item) => item.id === captureId
      ? { ...item, parseStatus: "parsed", parsedRevision: parseRevision, parsedItems, updatedAt }
      : item),
    expenses: [...newExpenses, ...replacedExpenses],
  };
}
