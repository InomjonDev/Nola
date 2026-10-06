import { WALLETLY_CURRENCIES } from "./constants.ts";
import { parseAmountValue } from "./currency-input.ts";
import { validCalendarDate } from "./savings-goals.ts";
import type { Account, Category, ExpenseDraft, IncomeEntryDraft, PaymentMethod, RecurringFrequency, RecurringRule, RecurringRuleDraft, Tag } from "./types.ts";

export type RecurringError = "recurring.amountError" | "recurring.currencyError" | "recurring.frequencyError" | "recurring.dateError" | "recurring.detailsError" | "recurring.accountError";
export type MaterializedRecurringTransaction = { id: string; ruleId: string; occurrenceDate: string; expense?: ExpenseDraft; income?: IncomeEntryDraft };

const UUID_NAMESPACE = "7dc5c6cb-6238-5f13-b02f-b4ea6ac3d04c";
const MAX_CATCH_UP_OCCURRENCES = 100;

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days, 12));
  return date.toISOString().slice(0, 10);
}

export function nextOccurrenceDate(dateValue: string, frequency: RecurringFrequency) {
  if (!validCalendarDate(dateValue)) return dateValue;
  if (frequency === "weekly") return addDays(dateValue, 7);
  const [year, month, day] = dateValue.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year!, month!, 1, 12));
  const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0, 12)).getUTCDate();
  nextMonth.setUTCDate(Math.min(day!, lastDay));
  return nextMonth.toISOString().slice(0, 10);
}

function uuidBytes(value: string) {
  return new Uint8Array(value.replaceAll("-", "").match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)));
}

export async function recurringOccurrenceId(ruleId: string, occurrenceDate: string) {
  const namespace = uuidBytes(UUID_NAMESPACE);
  const name = new TextEncoder().encode(`${ruleId}:${occurrenceDate}`);
  const bytes = new Uint8Array(namespace.length + name.length);
  bytes.set(namespace);
  bytes.set(name, namespace.length);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-1", bytes));
  const identifier = digest.slice(0, 16);
  identifier[6] = (identifier[6]! & 0x0f) | 0x50;
  identifier[8] = (identifier[8]! & 0x3f) | 0x80;
  const hex = [...identifier].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function validateRecurringRule(draft: RecurringRuleDraft, categories: Category[], paymentMethods: PaymentMethod[], accounts: Account[], tags: Tag[]): RecurringError | null {
  if (parseAmountValue(String(draft.amount)) === null) return "recurring.amountError";
  if (!(WALLETLY_CURRENCIES as readonly string[]).includes(draft.currency)) return "recurring.currencyError";
  if (draft.frequency !== "weekly" && draft.frequency !== "monthly") return "recurring.frequencyError";
  if (!validCalendarDate(draft.startDate)) return "recurring.dateError";
  if (draft.note.length > 160) return "recurring.detailsError";
  if (draft.accountId && !accounts.some((account) => account.id === draft.accountId && !account.deletedAt && !account.archivedAt && account.currency === draft.currency)) return "recurring.accountError";
  if (draft.kind === "income") {
    if (draft.categoryId !== null || draft.paymentMethodId !== null) return "recurring.detailsError";
  } else {
    if (!draft.categoryId || !categories.some((category) => category.id === draft.categoryId && !category.archivedAt)) return "recurring.detailsError";
    if (!draft.paymentMethodId || !paymentMethods.some((method) => method.id === draft.paymentMethodId && !method.archivedAt)) return "recurring.detailsError";
    if (draft.tagIds.some((id) => !tags.some((tag) => tag.id === id))) return "recurring.detailsError";
  }
  return null;
}

export async function materializeDueRecurringRules(rules: RecurringRule[], today: string) {
  const transactions: MaterializedRecurringTransaction[] = [];
  const updatedAt = new Date().toISOString();
  const updatedRules = await Promise.all(rules.map(async (rule) => {
    if (rule.deletedAt || rule.archivedAt || !validCalendarDate(rule.nextRunDate) || rule.nextRunDate > today) return rule;
    let nextRunDate = rule.nextRunDate;
    let count = 0;
    while (nextRunDate <= today && count < MAX_CATCH_UP_OCCURRENCES) {
      const occurrenceDate = nextRunDate;
      const id = await recurringOccurrenceId(rule.id, occurrenceDate);
      const [year, month, day] = occurrenceDate.split("-").map(Number);
      const occurredAt = new Date(Date.UTC(year!, month! - 1, day!, 12)).toISOString();
      if (rule.kind === "expense" && rule.categoryId && rule.paymentMethodId) {
        transactions.push({ id, ruleId: rule.id, occurrenceDate, expense: { amount: rule.amount, currency: rule.currency, categoryId: rule.categoryId, paymentMethodId: rule.paymentMethodId, spentAt: occurredAt, note: rule.note, tagIds: rule.tagIds, recurringRuleId: rule.id } });
      } else if (rule.kind === "income") {
        transactions.push({ id, ruleId: rule.id, occurrenceDate, income: { amount: rule.amount, currency: rule.currency, receivedAt: occurredAt, note: rule.note, accountId: rule.accountId, recurringRuleId: rule.id } });
      }
      nextRunDate = nextOccurrenceDate(nextRunDate, rule.frequency);
      count += 1;
    }
    return count ? { ...rule, nextRunDate, updatedAt } : rule;
  }));
  return { rules: updatedRules, transactions };
}
