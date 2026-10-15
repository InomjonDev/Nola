import { SUPPORTED_CURRENCIES } from "./constants.ts";
import { validateContribution, validateGoal } from "./savings-goals.ts";
import type { Expense, GoalContribution, IncomeEntry, ParsedCaptureAction, ParsedCaptureItem, SavingsGoal, SpendingCapture, SpendingFolder, Tag } from "./types.ts";

export type SpendingCaptureData = {
  spendingCaptures: SpendingCapture[];
  expenses: Expense[];
  incomeEntries?: IncomeEntry[];
  savingsGoals?: SavingsGoal[];
  goalContributions?: GoalContribution[];
};

function localCalendarDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function findDailyCapture(captures: SpendingCapture[], userId: string, date: Date) {
  const targetDate = localCalendarDate(date);
  if (!targetDate) return null;
  return captures
    .filter((capture) => capture.userId === userId && !capture.deletedAt && capture.parseStatus !== "undone" && localCalendarDate(capture.capturedAt) === targetDate)
    .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt))[0] ?? null;
}

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

export function captureActionIds(capture: SpendingCapture, type: ParsedCaptureAction["type"]) {
  return new Set((capture.parsedItems ?? []).flatMap((action) => (action.type ?? "expense") === type ? [action.id] : []));
}

function softDeleteActions(data: SpendingCaptureData, capture: SpendingCapture, deletedAt: string): Partial<SpendingCaptureData> {
  const incomeIds = captureActionIds(capture, "income");
  const goalIds = captureActionIds(capture, "goal");
  const contributionIds = captureActionIds(capture, "contribution");
  const deletedGoals = new Set([...goalIds].filter((goalId) => !data.goalContributions?.some((entry) => entry.goalId === goalId && !entry.deletedAt && !contributionIds.has(entry.id))));
  return {
    ...(data.incomeEntries ? { incomeEntries: data.incomeEntries.map((entry) => incomeIds.has(entry.id) && !entry.deletedAt ? { ...entry, deletedAt, updatedAt: deletedAt } : entry) } : {}),
    ...(data.goalContributions ? { goalContributions: data.goalContributions.map((entry) => contributionIds.has(entry.id) && !entry.deletedAt ? { ...entry, deletedAt, updatedAt: deletedAt } : entry) } : {}),
    ...(data.savingsGoals ? { savingsGoals: data.savingsGoals.map((goal) => deletedGoals.has(goal.id) && !goal.deletedAt ? { ...goal, deletedAt, updatedAt: deletedAt } : goal) } : {}),
  };
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
    ...softDeleteActions(data, capture, deletedAt),
  };
}

export function trashCaptureData<T extends SpendingCaptureData>(data: T, captureId: string, deletedAt: string): T {
  const capture = data.spendingCaptures.find((item) => item.id === captureId);
  if (!capture || capture.deletedAt || capture.parseStatus === "undone") return data;
  return {
    ...data,
    spendingCaptures: data.spendingCaptures.map((item) => item.id === captureId ? { ...item, deletedAt, updatedAt: deletedAt } : item),
    expenses: data.expenses.map((item) => item.captureId === captureId && !item.deletedAt ? { ...item, deletedAt, updatedAt: deletedAt } : item),
    ...softDeleteActions(data, capture, deletedAt),
  };
}

export function restoreCaptureData<T extends SpendingCaptureData>(data: T, captureId: string, restoredAt: string): T {
  const capture = data.spendingCaptures.find((item) => item.id === captureId);
  if (!capture?.deletedAt || capture.parseStatus === "undone") return data;
  const trashedAt = capture.deletedAt;
  const incomeIds = captureActionIds(capture, "income");
  const goalIds = captureActionIds(capture, "goal");
  const contributionIds = captureActionIds(capture, "contribution");
  return {
    ...data,
    spendingCaptures: data.spendingCaptures.map((item) => item.id === captureId ? { ...item, deletedAt: null, updatedAt: restoredAt } : item),
    expenses: data.expenses.map((item) => item.captureId === captureId && item.deletedAt === trashedAt ? { ...item, deletedAt: null, updatedAt: restoredAt } : item),
    ...(data.incomeEntries ? { incomeEntries: data.incomeEntries.map((item) => incomeIds.has(item.id) && item.deletedAt === trashedAt ? { ...item, deletedAt: null, updatedAt: restoredAt } : item) } : {}),
    ...(data.goalContributions ? { goalContributions: data.goalContributions.map((item) => contributionIds.has(item.id) && item.deletedAt === trashedAt ? { ...item, deletedAt: null, updatedAt: restoredAt } : item) } : {}),
    ...(data.savingsGoals ? { savingsGoals: data.savingsGoals.map((item) => goalIds.has(item.id) && item.deletedAt === trashedAt ? { ...item, deletedAt: null, updatedAt: restoredAt } : item) } : {}),
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

function validParsedMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1e12
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.0001;
}

function isParsedCaptureItem(value: unknown): value is ParsedCaptureItem & { type?: "expense" } {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ParsedCaptureItem>;
  return ((value as { type?: unknown }).type === undefined || (value as { type?: unknown }).type === "expense")
    && typeof item.id === "string" && item.id.trim().length > 0
    && validParsedMoney(item.amount)
    && typeof item.currency === "string" && /^[A-Z]{3}$/.test(item.currency)
    && typeof item.description === "string" && item.description.trim().length > 0 && item.description.length <= 160
    && (item.quantity === null || (typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 999_999_999.999 && Math.abs(item.quantity * 1000 - Math.round(item.quantity * 1000)) < 0.0001))
    && typeof item.spentAt === "string" && Number.isFinite(Date.parse(item.spentAt))
    && typeof item.categoryId === "string" && item.categoryId.trim().length > 0
    && typeof item.paymentMethodId === "string" && item.paymentMethodId.trim().length > 0
    && Array.isArray(item.tagIds) && item.tagIds.every((tagId) => typeof tagId === "string");
}

function isParsedCaptureAction(value: unknown): value is ParsedCaptureAction {
  if (isParsedCaptureItem(value)) return true;
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  const amount = action.type === "goal" ? action.targetAmount : action.amount;
  if (typeof action.id !== "string" || !action.id.trim() || typeof action.currency !== "string"
    || !/^[A-Z]{3}$/.test(action.currency)
    || !validParsedMoney(amount)) return false;
  if (action.type === "income") return typeof action.note === "string" && action.note.length <= 160
    && typeof action.receivedAt === "string" && Number.isFinite(Date.parse(action.receivedAt));
  if (action.type === "goal") return (SUPPORTED_CURRENCIES as readonly string[]).includes(action.currency) && typeof action.name === "string" && Boolean(action.name.trim()) && action.name.length <= 80
    && validParsedMoney(action.targetAmount)
    && typeof action.icon === "string" && ["wallet", "plane", "home", "car", "gift", "briefcase", "heart-pulse", "shopping-bag"].includes(action.icon)
    && (action.deadline === null || (typeof action.deadline === "string" && Number.isFinite(Date.parse(`${action.deadline}T12:00:00Z`)) && new Date(`${action.deadline}T12:00:00Z`).toISOString().slice(0, 10) === action.deadline));
  if (action.type === "contribution") return (SUPPORTED_CURRENCIES as readonly string[]).includes(action.currency) && typeof action.goalId === "string" && Boolean(action.goalId)
    && action.kind === "deposit" && typeof action.occurredOn === "string"
    && Number.isFinite(Date.parse(`${action.occurredOn}T12:00:00Z`))
    && new Date(`${action.occurredOn}T12:00:00Z`).toISOString().slice(0, 10) === action.occurredOn
    && typeof action.note === "string" && action.note.length <= 160;
  return false;
}

function validParsedCaptureItems(items: unknown): items is ParsedCaptureAction[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > 25 || !items.every(isParsedCaptureAction)) return false;
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

  const previousItems = capture.parsedItems ?? [];
  const previousIds = new Set(previousItems.map((item) => item.id));
  const previousGoalActions = previousItems.filter((item) => item.type === "goal");
  const goalIdMap = new Map<string, string>();
  for (const action of items) {
    if (action.type !== "goal") continue;
    const previous = previousGoalActions.find((item) => item.name.trim().toLocaleLowerCase("en-US") === action.name.trim().toLocaleLowerCase("en-US")
      && data.savingsGoals?.some((goal) => goal.id === item.id && !goal.deletedAt && !goal.archivedAt));
    if (previous) goalIdMap.set(action.id, previous.id);
  }
  const actions = items.map((action): ParsedCaptureAction => {
    if (action.type === "goal" && goalIdMap.has(action.id)) return { ...action, id: goalIdMap.get(action.id)! };
    if (action.type === "contribution" && goalIdMap.has(action.goalId)) return { ...action, goalId: goalIdMap.get(action.goalId)! };
    return action;
  });
  const actionIds = new Set(actions.map((item) => item.id));
  if (new Set([...actionIds]).size !== actions.length || actions.some((item) => !previousIds.has(item.id) && (
    data.expenses.some((row) => row.id === item.id) || data.incomeEntries?.some((row) => row.id === item.id)
      || data.savingsGoals?.some((row) => row.id === item.id) || data.goalContributions?.some((row) => row.id === item.id)
  ))) return data;

  const newGoals = actions.filter((action) => action.type === "goal");
  const currentGoals = data.savingsGoals ?? [];
  const currentContributions = data.goalContributions ?? [];
  for (const action of newGoals) {
    if (action.type !== "goal") continue;
    const existing = currentGoals.find((goal) => goal.id === action.id);
    if (validateGoal({ name: action.name, targetAmount: action.targetAmount, currency: action.currency, icon: action.icon, deadline: action.deadline }, existing, currentContributions)) return data;
  }
  const nextGoalLookup = [...currentGoals.filter((goal) => !goal.deletedAt), ...newGoals.map((action) => ({
    id: action.id, userId: capture.userId, name: action.name, targetAmount: action.targetAmount, currency: action.currency,
    icon: action.icon, deadline: action.deadline, archivedAt: null, deletedAt: null, updatedAt,
  }))];
  const newContributions = actions.filter((action) => action.type === "contribution");
  const validatedContributions: GoalContribution[] = [...currentContributions];
  for (const action of newContributions) {
    if (action.type !== "contribution") continue;
    const goal = nextGoalLookup.find((item) => item.id === action.goalId && item.userId === capture.userId);
    if (validateContribution(goal, validatedContributions, action)) return data;
    if (!validatedContributions.some((item) => item.id === action.id)) {
      validatedContributions.push({ ...action, userId: capture.userId, deletedAt: null, updatedAt });
    }
  }

  const parsedItems = actions.map((item) => item.type === "expense" || item.type === undefined ? { ...item, tagIds: [...capture.tagIds] } : item);
  const replacedExpenses = data.expenses.map((expense) => expense.captureId === captureId && !expense.deletedAt
    ? { ...expense, deletedAt: updatedAt, updatedAt }
    : expense);
  const newExpenses: Expense[] = parsedItems.flatMap((item) => item.type === "expense" || item.type === undefined ? [{
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
  }] : []);

  const previousIncomeIds = captureActionIds(capture, "income");
  const previousGoalIds = captureActionIds(capture, "goal");
  const previousContributionIds = captureActionIds(capture, "contribution");
  const incomes = parsedItems.flatMap((item) => item.type === "income" ? [{
    ...(data.incomeEntries?.find((entry) => entry.id === item.id) ?? {}),
    id: item.id, userId: capture.userId, amount: item.amount, currency: item.currency, accountId: null, recurringRuleId: null,
    receivedAt: item.receivedAt, note: item.note, deletedAt: null, updatedAt,
  } as IncomeEntry] : []);
  const contributions = parsedItems.flatMap((item) => item.type === "contribution" ? [{
    ...(data.goalContributions?.find((entry) => entry.id === item.id) ?? {}),
    id: item.id, goalId: item.goalId, userId: capture.userId, amount: item.amount, currency: item.currency, kind: item.kind,
    occurredOn: item.occurredOn, note: item.note, deletedAt: null, updatedAt,
  } as GoalContribution] : []);
  const goals = parsedItems.flatMap((item) => item.type === "goal" ? [{
    ...(currentGoals.find((goal) => goal.id === item.id) ?? {}),
    id: item.id, userId: capture.userId, name: item.name, targetAmount: item.targetAmount, currency: item.currency, icon: item.icon,
    deadline: item.deadline, archivedAt: currentGoals.find((goal) => goal.id === item.id)?.archivedAt ?? null, deletedAt: null, updatedAt,
  } as SavingsGoal] : []);
  const unrelatedContributionGoalIds = new Set(currentContributions.filter((entry) => !entry.deletedAt && !previousContributionIds.has(entry.id)).map((entry) => entry.goalId));
  const replacedIncomes = data.incomeEntries?.map((entry) => previousIncomeIds.has(entry.id) && !actionIds.has(entry.id) && !entry.deletedAt ? { ...entry, deletedAt: updatedAt, updatedAt } : entry);
  const replacedContributions = data.goalContributions?.map((entry) => previousContributionIds.has(entry.id) && !actionIds.has(entry.id) && !entry.deletedAt ? { ...entry, deletedAt: updatedAt, updatedAt } : entry);
  const replacedGoals = data.savingsGoals?.map((goal) => previousGoalIds.has(goal.id) && !actionIds.has(goal.id) && !unrelatedContributionGoalIds.has(goal.id) && !goal.deletedAt ? { ...goal, deletedAt: updatedAt, updatedAt } : goal);
  const incomeEntries = data.incomeEntries ? [...incomes, ...(replacedIncomes ?? []).filter((entry) => !incomes.some((item) => item.id === entry.id))] : undefined;
  const goalContributions = data.goalContributions ? [...contributions, ...(replacedContributions ?? []).filter((entry) => !contributions.some((item) => item.id === entry.id))] : undefined;
  const savingsGoals = data.savingsGoals ? [...goals, ...(replacedGoals ?? []).filter((goal) => !goals.some((item) => item.id === goal.id))] : undefined;

  return {
    ...data,
    spendingCaptures: data.spendingCaptures.map((item) => item.id === captureId
      ? { ...item, parseStatus: "parsed", parsedRevision: parseRevision, parsedItems, updatedAt }
      : item),
    expenses: [...newExpenses, ...replacedExpenses],
    ...(incomeEntries ? { incomeEntries } : {}),
    ...(savingsGoals ? { savingsGoals } : {}),
    ...(goalContributions ? { goalContributions } : {}),
  };
}
