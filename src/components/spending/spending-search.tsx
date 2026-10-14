"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Search, X } from "@/components/icons";
import { useI18n } from "@/lib/i18n-provider";
import { formatCompactDate, formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { searchSpendingRecords, type SpendingSearchResult } from "@/lib/capture-search";
import { categoryLabel, paymentLabel } from "@/lib/display-labels";
import type { Category, Expense, PaymentMethod, SpendingCapture, SpendingFolder, Tag } from "@/lib/types";

function HighlightedText({ text, range }: { text: string; range?: { start: number; end: number } }) {
  if (!range || range.start < 0 || range.end <= range.start || range.start >= text.length) return <>{text}</>;
  const start = Math.min(range.start, text.length);
  const end = Math.min(range.end, text.length);
  return <>{text.slice(0, start)}<mark className="rounded-sm bg-accent/20 text-inherit">{text.slice(start, end)}</mark>{text.slice(end)}</>;
}

export function SpendingSearch({
  captures,
  expenses,
  categories,
  paymentMethods,
  tags,
  folders = [],
  initialQuery = "",
  query: controlledQuery,
  hideInput = false,
  autoFocus = false,
  captureResultsLabel,
  expenseResultsLabel,
  emptyLabel,
  promptLabel,
  clearLabel,
  resultCountLabel,
  onQueryChange,
  onOpenCapture,
  onOpenExpense,
  onClose,
  closeLabel,
}: {
  captures: SpendingCapture[];
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  tags: Tag[];
  folders?: SpendingFolder[];
  initialQuery?: string;
  query?: string;
  hideInput?: boolean;
  autoFocus?: boolean;
  captureResultsLabel?: string;
  expenseResultsLabel?: string;
  emptyLabel?: string;
  promptLabel?: string;
  clearLabel?: string;
  resultCountLabel?: (count: number) => string;
  onQueryChange?: (query: string) => void;
  onOpenCapture?: (captureId: string) => void;
  onOpenExpense?: (expenseId: string) => void;
  onClose?: () => void;
  closeLabel?: string;
}) {
  const { language, t } = useI18n();
  const [internalQuery, setInternalQuery] = useState(initialQuery);
  const query = controlledQuery ?? internalQuery;
  const results = useMemo(() => searchSpendingRecords(query, captures, expenses, categories, tags), [query, captures, expenses, categories, tags]);
  const captureResults = results.filter((result) => result.kind === "capture");
  const expenseResults = results.filter((result) => result.kind === "expense");
  const captureById = useMemo(() => new Map(captures.map((capture) => [capture.id, capture])), [captures]);
  const expenseById = useMemo(() => new Map(expenses.map((expense) => [expense.id, expense])), [expenses]);
  const folderById = useMemo(() => new Map(folders.filter((folder) => !folder.deletedAt).map((folder) => [folder.id, folder.name])), [folders]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const paymentById = useMemo(() => new Map(paymentMethods.map((method) => [method.id, method])), [paymentMethods]);
  const fieldLabel: Record<SpendingSearchResult["matchField"], string> = {
    sourceText: t("capture.noteLabel"),
    amount: t("expense.amount"),
    date: t("expense.date"),
    category: t("expense.category"),
    description: t("expense.noteOptional"),
    tag: t("expense.tags"),
  };

  function updateQuery(value: string) {
    if (controlledQuery === undefined) setInternalQuery(value);
    onQueryChange?.(value);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function resultTitle(result: SpendingSearchResult) {
    if (result.kind === "capture") return result.title;
    const capture = result.captureId ? captureById.get(result.captureId) : undefined;
    return capture?.sourceText ?? result.title;
  }

  function openResult(result: SpendingSearchResult) {
    if (result.kind === "capture") {
      onOpenCapture?.(result.recordId);
      return;
    }
    if (result.captureId && onOpenCapture) onOpenCapture(result.captureId);
    else onOpenExpense?.(result.recordId);
  }

  function resultAction(result: SpendingSearchResult) {
    if (result.kind === "capture") return onOpenCapture;
    return result.captureId ? onOpenCapture : onOpenExpense;
  }

  function renderResultRow(result: SpendingSearchResult) {
    const action = resultAction(result);
    const matchedExpense = result.kind === "expense" ? expenseById.get(result.recordId) : undefined;
    const categoryEntity = matchedExpense ? categoryById.get(matchedExpense.categoryId) : undefined;
    const paymentEntity = matchedExpense ? paymentById.get(matchedExpense.paymentMethodId) : undefined;
    const linkedExpenses = result.kind === "capture"
      ? expenses.filter((expense) => expense.captureId === result.recordId && !expense.deletedAt)
      : matchedExpense ? [matchedExpense] : [];
    const linkedFolder = result.captureId ? folderById.get(captureById.get(result.captureId)?.folderId ?? "") : undefined;
    const title = resultTitle(result);
    const dateText = formatCompactDate(result.displayDate);
    const accessibleParts = [`${fieldLabel[result.matchField]}: ${title.slice(0, 160)}`];
    for (const expense of linkedExpenses) {
      const linkedCategory = categoryById.get(expense.categoryId);
      const linkedPayment = paymentById.get(expense.paymentMethodId);
      accessibleParts.push(`${t("expense.amount")}: ${formatMoney(expense.amount, expense.currency, languageLocale(language))}`);
      if (linkedCategory) accessibleParts.push(`${t("expense.category")}: ${categoryLabel(linkedCategory, t)}`);
      if (linkedPayment) accessibleParts.push(`${t("expense.paymentMethod")}: ${paymentLabel(linkedPayment.name, t)}`);
      accessibleParts.push(`${t("expense.date")}: ${formatCompactDate(expense.spentAt)}`);
    }
    if (linkedFolder) accessibleParts.push(`${t("folders.title")}: ${linkedFolder}`);
    if (result.kind === "capture" || !matchedExpense) accessibleParts.push(`${t("expense.date")}: ${dateText}`);
    const accessibleName = accessibleParts.join(", ");
    const details = <>
      <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 text-xs text-muted">
        <span>{fieldLabel[result.matchField]}:</span>
        <span className="break-words text-text [overflow-wrap:anywhere]">{result.matchField === "tag" ? <><span aria-hidden="true">#</span><HighlightedText text={result.matchText} range={result.highlight} /></> : <HighlightedText text={result.matchText} range={result.highlight} />}</span>
      </span>
      {result.kind === "expense" && result.amount !== undefined && result.currency && <span className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums text-text">{formatMoney(result.amount, result.currency, languageLocale(language))}</span>}
    </>;
    const rowClass = "flex min-h-14 w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";
    const contents = <>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 break-words text-sm font-medium leading-5 text-text [overflow-wrap:anywhere]">{result.matchField === "sourceText" ? <HighlightedText text={title} range={result.highlight} /> : title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {details}
          {categoryEntity && result.matchField !== "category" && <span className="text-xs text-muted">{categoryLabel(categoryEntity, t)}</span>}
          {paymentEntity && <span className="text-xs text-muted">{paymentLabel(paymentEntity.name, t)}</span>}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted">
          <time dateTime={result.displayDate}>{dateText}</time>
          {linkedFolder && <span>{linkedFolder}</span>}
          {result.kind === "expense" && <span>{t("history.expense")}</span>}
        </span>
      </span>
    </>;

    return <li key={result.key} className="border-b border-line last:border-b-0">
      {action ? <button type="button" className={rowClass} onClick={() => openResult(result)} aria-label={accessibleName}>{contents}</button>
        : <div className={rowClass}>{contents}</div>}
    </li>;
  }

  return <section className="grid min-w-0 gap-5" aria-label={t("history.search")}>
    {!hideInput && <form role="search" className="flex min-w-0 items-center gap-2" onSubmit={submit}>
      <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-control-edge bg-surface px-4 focus-within:ring-2 focus-within:ring-accent">
        <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        <input type="search" className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base text-text outline-none placeholder:text-muted" placeholder={t("history.search")} aria-label={t("history.search")} value={query} autoFocus={autoFocus} onChange={(event) => updateQuery(event.target.value)} />
        {query && clearLabel && <button type="button" className="icon-button min-h-11 min-w-11" aria-label={clearLabel} onClick={() => updateQuery("")}><X className="h-4 w-4" /></button>}
      </div>
      {onClose && <button type="button" className="icon-button min-h-11 min-w-11 shrink-0 bg-surface" aria-label={closeLabel ?? t("common.close")} onClick={onClose}><X className="h-5 w-5" /></button>}
    </form>}

    {!query.trim() && promptLabel && <p className="px-1 text-sm leading-6 text-muted">{promptLabel}</p>}
    {query.trim() && results.length === 0 && <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-sm leading-6 text-muted">{emptyLabel ?? t("history.nothingFound")}</p>}
    {query.trim() && results.length > 0 && <div className="grid gap-5">
      {resultCountLabel && <p className="px-1 text-sm text-muted">{resultCountLabel(results.length)}</p>}
      {captureResults.length > 0 && <section aria-labelledby="spending-search-captures">
        <h2 id="spending-search-captures" className="mb-2 px-1 text-base font-semibold text-text">{captureResultsLabel ?? t("capture.noteLabel")} <span className="ml-1 text-sm font-normal text-muted">{captureResults.length}</span></h2>
        <ul className="overflow-hidden rounded-2xl bg-surface">{captureResults.map(renderResultRow)}</ul>
      </section>}
      {expenseResults.length > 0 && <section aria-labelledby="spending-search-expenses">
        <h2 id="spending-search-expenses" className="mb-2 px-1 text-base font-semibold text-text">{expenseResultsLabel ?? t("history.expenses")} <span className="ml-1 text-sm font-normal text-muted">{expenseResults.length}</span></h2>
        <ul className="overflow-hidden rounded-2xl bg-surface">{expenseResults.map(renderResultRow)}</ul>
      </section>}
    </div>}
  </section>;
}
