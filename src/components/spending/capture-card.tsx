"use client";

import { CategoryIcon } from "@/components/category-icon";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { formatMoney } from "@/lib/format";
import { captureTotal } from "@/lib/spending-captures";
import { categoryLabel } from "@/lib/display-labels";
import type { Category, Expense, SpendingCapture, Tag } from "@/lib/types";

export type CaptureParseIssue = "signIn" | "retry" | "sync";

export function CaptureCard({
  capture,
  expenses,
  categories,
  tags,
  folderName,
  issue,
  onOpen,
  onRetry,
  onSignIn,
  onUndo,
  undoLabel,
  signInLabel,
  highlight,
}: {
  capture: SpendingCapture;
  expenses: Expense[];
  categories: Category[];
  tags: Tag[];
  folderName?: string;
  issue?: CaptureParseIssue;
  onOpen: () => void;
  onRetry?: () => void;
  onSignIn?: () => void;
  onUndo?: () => void;
  undoLabel?: string;
  signInLabel?: string;
  highlight?: { start: number; end: number };
}) {
  const { language, t } = useI18n();
  const linkedExpenses = expenses.filter((expense) => expense.captureId === capture.id && !expense.deletedAt);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const captureTags = capture.tagIds.flatMap((id) => {
    const tag = tagsById.get(id);
    return tag ? [tag] : [];
  });
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const currencies = [...new Set(linkedExpenses.map((expense) => expense.currency))];
  const status = capture.parseStatus === "processing"
    ? t("capture.processing")
    : capture.parseStatus === "needs_retry"
      ? issue === "signIn"
        ? t("capture.needsSignIn")
        : issue === "sync"
          ? t("capture.syncPending")
          : t("capture.retryDetail")
      : capture.parseStatus === "parsed"
        ? t("capture.parseComplete").replace("{count}", String(linkedExpenses.length))
        : t("capture.saved");
  const canRetry = Boolean(onRetry) && issue !== "signIn" && (capture.parseStatus === "needs_retry" || (capture.parseStatus === "pending" && issue === "sync"));

  function renderSource() {
    if (!highlight || highlight.start < 0 || highlight.end <= highlight.start || highlight.start >= capture.sourceText.length) {
      return capture.sourceText;
    }
    const start = Math.min(highlight.start, capture.sourceText.length);
    const end = Math.min(highlight.end, capture.sourceText.length);
    return <>{capture.sourceText.slice(0, start)}<mark className="rounded-sm bg-accent/20 text-inherit">{capture.sourceText.slice(start, end)}</mark>{capture.sourceText.slice(end)}</>;
  }

  return <article className="group min-w-0 border-b border-line py-4 first:pt-0 last:border-b-0">
    <button
      type="button"
      className="flex min-h-11 w-full min-w-0 flex-col items-start gap-2 rounded-xl text-left outline-none transition-colors hover:bg-raised/60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label={`${t("capture.noteLabel")}: ${capture.sourceText.slice(0, 120)}`}
      onClick={onOpen}
    >
      <span className="w-full whitespace-pre-line break-words text-[17px] font-medium leading-6 text-text [overflow-wrap:anywhere]">{renderSource()}</span>
      <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <time dateTime={capture.capturedAt}>{new Date(capture.capturedAt).toLocaleString(languageLocale(language), { dateStyle: "medium", timeStyle: "short" })}</time>
        {folderName && <><span aria-hidden="true">·</span><span>{folderName}</span></>}
        {linkedExpenses.length > 0 && <><span aria-hidden="true">·</span><span>{linkedExpenses.length} {linkedExpenses.length === 1 ? t("history.expense") : t("history.expenses")}</span></>}
        {capture.parseStatus === "processing" && <><span aria-hidden="true">·</span><span role="status">{status}</span></>}
      </span>
    </button>

    {(linkedExpenses.length > 0 || captureTags.length > 0) && <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 pl-0.5">
      {linkedExpenses.slice(0, 3).map((expense) => {
        const category = categoriesById.get(expense.categoryId);
        return <span key={expense.id} className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-xs text-muted">
          <CategoryIcon name={category?.name} icon={category?.icon} className="h-3.5 w-3.5" size={14} />
          <span className="max-w-[12rem] truncate">{expense.note || (category ? categoryLabel(category, t) : t("history.expense"))}</span>
          <span className="whitespace-nowrap font-medium tabular-nums text-text">{formatMoney(expense.amount, expense.currency, languageLocale(language))}</span>
        </span>;
      })}
      {linkedExpenses.length > 3 && <span className="text-xs text-muted">+{linkedExpenses.length - 3}</span>}
      {currencies.map((currency) => <span key={currency} className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums text-text">
        {formatMoney(captureTotal(expenses, capture.id, currency), currency, languageLocale(language))}
      </span>)}
      {captureTags.map((tag) => <span key={tag.id} className="rounded-full border border-line px-2 py-1 text-xs text-muted">#{tag.name}</span>)}
    </div>}

    {(capture.parseStatus === "needs_retry" || issue === "signIn" || issue === "sync") && <p className="mt-2 text-sm leading-5 text-muted" role={issue === "retry" || capture.parseStatus === "needs_retry" ? "status" : undefined}>{status}</p>}

    {(canRetry || (issue === "signIn" && onSignIn) || onUndo) && <div className="mt-2 flex flex-wrap items-center gap-2">
      {canRetry && <button type="button" className="control min-h-11 justify-center bg-raised px-3 text-sm font-medium text-text" onClick={onRetry}>
        {issue === "sync" ? t("capture.retrySync") : t("capture.retry")}
      </button>}
      {issue === "signIn" && onSignIn && <button type="button" className="control min-h-11 justify-center bg-accent px-3 text-sm font-semibold text-on-accent" onClick={onSignIn}>{signInLabel ?? t("capture.signInForAi")}</button>}
      {onUndo && <button type="button" className="control min-h-11 justify-center px-3 text-sm text-muted" onClick={onUndo}>{undoLabel ?? t("history.undo")}</button>}
    </div>}
  </article>;
}
