import { WALLETLY_CURRENCIES } from "./constants.ts";
import type { GoalContribution, SavingsGoal, SavingsGoalDraft } from "./types.ts";

export const GOAL_ICONS = ["wallet", "plane", "home", "car", "gift", "briefcase", "heart-pulse", "shopping-bag"] as const;
export type GoalError = "goals.nameError" | "goals.amountError" | "goals.dateError" | "goals.currencyError" | "goals.currencyLocked" | "goals.insufficientSavings" | "goals.inactiveError" | "goals.noteError" | "goals.iconError";
export type GoalActionResult = { id?: string; error: GoalError | null };

export function calendarDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validGoalAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0 && amount < 1e12 && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.0001;
}

export function goalEntries(goal: SavingsGoal, contributions: GoalContribution[]) {
  const latest = new Map<string, GoalContribution>();
  for (const item of contributions) {
    if (item.goalId !== goal.id || item.userId !== goal.userId || item.currency !== goal.currency) continue;
    const previous = latest.get(item.id);
    if (!previous || item.updatedAt >= previous.updatedAt) latest.set(item.id, item);
  }
  return [...latest.values()].filter((item) => !item.deletedAt);
}

export function goalProgress(goal: SavingsGoal, contributions: GoalContribution[], today = calendarDate()) {
  const cents = goalEntries(goal, contributions).reduce((sum, item) => sum + Math.round(item.amount * 100) * (item.kind === "withdrawal" ? -1 : 1), 0);
  const targetCents = Math.round(goal.targetAmount * 100);
  const reached = cents >= targetCents;
  return {
    saved: cents / 100,
    remaining: Math.max(0, targetCents - cents) / 100,
    percentage: Math.max(0, Math.min(100, targetCents > 0 ? cents / targetCents * 100 : 0)),
    reached,
    overdue: Boolean(goal.deadline && goal.deadline < today && !reached && !goal.archivedAt),
    negativeBalance: cents < 0,
  };
}

export function goalCompletionSnapshot(goal: SavingsGoal, contributions: GoalContribution[]) {
  const entries = goalEntries(goal, contributions);
  return { reached: goalProgress(goal, contributions).reached, contributionIds: new Set(entries.map((item) => item.id)) };
}

export function newlyCompletedByDeposit(goal: SavingsGoal, contributions: GoalContribution[], previous: ReturnType<typeof goalCompletionSnapshot> | undefined) {
  if (!previous || previous.reached || !goalProgress(goal, contributions).reached) return false;
  return goalEntries(goal, contributions).some((entry) => entry.kind === "deposit" && !previous.contributionIds.has(entry.id));
}

export function validateGoal(draft: SavingsGoalDraft, existing?: SavingsGoal, contributions: GoalContribution[] = []): GoalError | null {
  if (!draft.name.trim() || draft.name.trim().length > 80) return "goals.nameError";
  if (!validGoalAmount(draft.targetAmount)) return "goals.amountError";
  if (!(GOAL_ICONS as readonly string[]).includes(draft.icon)) return "goals.iconError";
  if (!(WALLETLY_CURRENCIES as readonly string[]).includes(draft.currency)) return "goals.currencyError";
  if (draft.deadline !== null && !validCalendarDate(draft.deadline)) return "goals.dateError";
  if (existing?.deletedAt) return "goals.inactiveError";
  if (existing && existing.currency !== draft.currency && contributions.some((item) => item.goalId === existing.id && item.userId === existing.userId)) return "goals.currencyLocked";
  return null;
}

export function validateContribution(goal: SavingsGoal | undefined, contributions: GoalContribution[], draft: Pick<GoalContribution, "amount" | "kind" | "occurredOn" | "note" | "currency">): GoalError | null {
  if (!goal || goal.deletedAt || goal.archivedAt) return "goals.inactiveError";
  if (!validGoalAmount(draft.amount)) return "goals.amountError";
  if (!validCalendarDate(draft.occurredOn)) return "goals.dateError";
  if (draft.currency !== goal.currency) return "goals.currencyError";
  if (draft.note.length > 160) return "goals.noteError";
  if (draft.kind === "withdrawal" && Math.round(draft.amount * 100) > Math.round(goalProgress(goal, contributions).saved * 100)) return "goals.insufficientSavings";
  return null;
}

export function normalizeGoalData(source: { savingsGoals?: SavingsGoal[]; goalContributions?: GoalContribution[] }, userId: string) {
  const savingsGoals = (source.savingsGoals ?? []).filter((goal) => goal.userId === userId);
  const byId = new Map(savingsGoals.map((goal) => [goal.id, goal]));
  const goalContributions = (source.goalContributions ?? []).filter((entry) => entry.userId === userId && byId.get(entry.goalId)?.currency === entry.currency);
  return { savingsGoals, goalContributions };
}
