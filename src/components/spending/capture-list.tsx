"use client";

import { useMemo } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { CaptureCard, type CaptureParseIssue } from "@/components/spending/capture-card";
import { useI18n } from "@/lib/i18n-provider";
import { formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { categoryLabel } from "@/lib/display-labels";
import type { Category, Expense, SpendingCapture, SpendingFolder, Tag } from "@/lib/types";

type ListEntry =
  | { kind: "capture"; capture: SpendingCapture; date: string }
  | { kind: "expense"; expense: Expense; date: string };

function StandaloneExpenseRow({ expense, categories, tags, onOpen }: { expense: Expense; categories: Category[]; tags: Tag[]; onOpen: () => void }) {
  const { language, t } = useI18n();
  const category = categories.find((item) => item.id === expense.categoryId);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const expenseTags = expense.tagIds.flatMap((id) => {
    const tag = tagsById.get(id);
    return tag ? [tag] : [];
  });
  const title = expense.note || (category ? categoryLabel(category, t) : t("history.expense"));

  return <article className="border-b border-line py-1 last:border-b-0">
    <button type="button" className="flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-raised/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`${t("history.expense")}: ${title}, ${formatMoney(expense.amount, expense.currency, languageLocale(language))}`} onClick={onOpen}>
      <CategoryIcon name={category?.name} icon={category?.icon} className="h-5 w-5" />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-medium text-text [overflow-wrap:anywhere]">{title}</span>
        <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
          <span>{category ? categoryLabel(category, t) : t("history.expense")}</span>
          <time dateTime={expense.spentAt}>{new Date(expense.spentAt).toLocaleDateString(languageLocale(language), { dateStyle: "medium" })}</time>
          {expense.quantity !== null && <span>{expense.quantity}×</span>}
        </span>
      </span>
      <span className="max-w-[45%] break-all text-right text-sm font-semibold tabular-nums text-text">{formatMoney(expense.amount, expense.currency, languageLocale(language))}</span>
    </button>
    {expenseTags.length > 0 && <ul className="ml-10 flex flex-wrap gap-1.5 pb-2" aria-label={t("expense.tags")}>
      {expenseTags.map((tag) => <li key={tag.id} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">#{tag.name}</li>)}
    </ul>}
  </article>;
}

export function CaptureList({
  captures,
  expenses,
  categories,
  tags,
  folders = [],
  folderId,
  categoryId,
  tagId,
  issues = {},
  emptyLabel,
  signInLabel,
  onOpenCapture,
  onOpenExpense,
  onRetryCapture,
  onSignInCapture,
}: {
  captures: SpendingCapture[];
  expenses: Expense[];
  categories: Category[];
  tags: Tag[];
  folders?: SpendingFolder[];
  /** Undefined shows all folders; null selects only unfiled records. */
  folderId?: string | null;
  categoryId?: string | null;
  tagId?: string | null;
  issues?: Record<string, CaptureParseIssue>;
  emptyLabel?: string;
  signInLabel?: string;
  onOpenCapture: (captureId: string) => void;
  onOpenExpense: (expenseId: string) => void;
  onRetryCapture?: (captureId: string) => void;
  onSignInCapture?: (captureId: string) => void;
}) {
  const { t } = useI18n();
  const folderNames = useMemo(() => new Map(folders.filter((folder) => !folder.deletedAt).map((folder) => [folder.id, folder.name])), [folders]);
  const expenseByCapture = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      if (!expense.captureId || expense.deletedAt) continue;
      const linked = map.get(expense.captureId) ?? [];
      linked.push(expense);
      map.set(expense.captureId, linked);
    }
    return map;
  }, [expenses]);
  const visibleCaptures = useMemo(() => captures
    .filter((capture) => !capture.deletedAt && capture.parseStatus !== "undone")
    .filter((capture) => folderId === undefined || capture.folderId === folderId)
    .filter((capture) => !tagId || capture.tagIds.includes(tagId) || (expenseByCapture.get(capture.id) ?? []).some((expense) => expense.tagIds.includes(tagId)))
    .filter((capture) => !categoryId || (expenseByCapture.get(capture.id) ?? []).some((expense) => expense.categoryId === categoryId))
    .map((capture): ListEntry => ({ kind: "capture", capture, date: capture.capturedAt })),
  [captures, categoryId, expenseByCapture, folderId, tagId]);
  const visibleStandaloneExpenses = useMemo(() => expenses
    .filter((expense) => expense.captureId === null && !expense.deletedAt)
    // A standalone expense has no folder and belongs in All or Unfiled views.
    .filter(() => folderId === undefined || folderId === null)
    .filter((expense) => !categoryId || expense.categoryId === categoryId)
    .filter((expense) => !tagId || expense.tagIds.includes(tagId))
    .map((expense): ListEntry => ({ kind: "expense", expense, date: expense.spentAt })),
  [expenses, categoryId, folderId, tagId]);
  const entries = useMemo(() => [...visibleCaptures, ...visibleStandaloneExpenses]
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date)), [visibleCaptures, visibleStandaloneExpenses]);
  if (entries.length === 0) return <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-sm leading-6 text-muted">{emptyLabel ?? t("history.nothingFound")}</p>;

  return <div className="capture-list rounded-2xl bg-surface px-4 py-4 sm:px-5">
    {entries.map((entry) => entry.kind === "capture"
      ? <CaptureCard
        key={`capture:${entry.capture.id}`}
        capture={entry.capture}
        expenses={expenseByCapture.get(entry.capture.id) ?? []}
        categories={categories}
        tags={tags}
        folderName={entry.capture.folderId ? folderNames.get(entry.capture.folderId) : undefined}
        issue={issues[entry.capture.id]}
        signInLabel={signInLabel}
        onOpen={() => onOpenCapture(entry.capture.id)}
        onRetry={onRetryCapture ? () => onRetryCapture(entry.capture.id) : undefined}
        onSignIn={onSignInCapture ? () => onSignInCapture(entry.capture.id) : undefined}
      />
      : <StandaloneExpenseRow key={`expense:${entry.expense.id}`} expense={entry.expense} categories={categories} tags={tags} onOpen={() => onOpenExpense(entry.expense.id)} />)}
  </div>;
}
