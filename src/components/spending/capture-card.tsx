"use client";

import { CategoryIcon } from "@/components/category-icon";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { formatCompactDate, formatDayMonth, formatMoney } from "@/lib/format";
import { captureTotal } from "@/lib/spending-captures";
import { categoryLabel } from "@/lib/display-labels";
import { captureParseIssueMessage, type CaptureParseIssue } from "@/lib/capture-parse-issue";
import type { Category, Expense, SpendingCapture, Tag } from "@/lib/types";

export type { CaptureParseIssue } from "@/lib/capture-parse-issue";

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
  signInLabel,
  highlight,
  presentation = "standard",
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
  signInLabel?: string;
  highlight?: { start: number; end: number };
  presentation?: "standard" | "timeline";
}) {
  const { language, t } = useI18n();
  const linkedExpenses = expenses.filter((expense) => expense.captureId === capture.id && !expense.deletedAt);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const captureTags = capture.tagIds.flatMap((id) => {
    const tag = tagsById.get(id);
    return tag ? [tag] : [];
  });
  const currencies = [...new Set(linkedExpenses.map((expense) => expense.currency))];
  const seenCategoryIds = new Set<string>();
  const linkedCategories = linkedExpenses.flatMap((expense) => {
    if (seenCategoryIds.has(expense.categoryId)) return [];
    seenCategoryIds.add(expense.categoryId);
    const category = categoriesById.get(expense.categoryId);
    return [{ id: expense.categoryId, category, label: category ? categoryLabel(category, t) : t("history.expense") }];
  });
  const status = capture.parseStatus === "processing"
    ? t("capture.processing")
    : capture.parseStatus === "needs_retry"
      ? captureParseIssueMessage(issue, t)
      : capture.parseStatus === "parsed"
        ? t("capture.parseComplete").replace("{count}", String(capture.parsedItems?.length ?? linkedExpenses.length))
        : t("capture.saved");
  const needsClarification = issue === "goalTarget" || issue === "goalNotFound" || issue === "goalAmbiguous";
  const canRetry = Boolean(onRetry) && issue !== "signIn" && !needsClarification && (capture.parseStatus === "needs_retry" || (capture.parseStatus === "pending" && issue === "sync"));
  const capturedAt = new Date(capture.capturedAt);
  let capturedLabel = capture.capturedAt;
  if (Number.isFinite(capturedAt.getTime())) {
    capturedLabel = presentation === "timeline"
      ? formatDayMonth(capture.capturedAt)
      : formatCompactDate(capture.capturedAt);
  }

  function renderSource() {
    if (!highlight || highlight.start < 0 || highlight.end <= highlight.start || highlight.start >= capture.sourceText.length) {
      return capture.sourceText;
    }
    const start = Math.min(highlight.start, capture.sourceText.length);
    const end = Math.min(highlight.end, capture.sourceText.length);
    return <>{capture.sourceText.slice(0, start)}<mark className="rounded-sm bg-accent/20 text-inherit">{capture.sourceText.slice(start, end)}</mark>{capture.sourceText.slice(end)}</>;
  }

  const expenseCountLabel = `${linkedExpenses.length} ${linkedExpenses.length === 1 ? t("history.expense") : t("history.expenses")}`;
  const parsedCount = capture.parsedItems?.length ?? linkedExpenses.length;
  const categoryNames = [...new Set(linkedCategories.map((item) => item.label))];
  const totalLabels = currencies.map((currency) => formatMoney(captureTotal(expenses, capture.id, currency), currency, languageLocale(language)));
  const accessibleName = `${t("capture.noteLabel")}: ${capture.sourceText.slice(0, 160)}. ${capturedLabel}. ${expenseCountLabel}${categoryNames.length ? `. ${t("expense.category")}: ${categoryNames.join(", ")}` : ""}${totalLabels.length ? `. ${t("capture.total")}: ${totalLabels.join(", ")}` : ""}`;

  return <article className={`capture-card group min-w-0 border-b border-line first:pt-0 last:border-b-0${presentation === "timeline" ? " capture-card--timeline" : ""}`}>
    <button
      type="button"
      className="capture-card-open flex min-h-11 w-full min-w-0 flex-col items-start rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label={accessibleName}
      onClick={onOpen}
    >
      <span className="capture-card-date">
        <time dateTime={capture.capturedAt}>{capturedLabel}</time>
        {folderName && <><span aria-hidden="true">·</span><span className="truncate">{folderName}</span></>}
        {capture.parseStatus === "processing" && <><span aria-hidden="true">·</span><span role="status">{status}</span></>}
      </span>

      {highlight && <span className="capture-card-search-match">{renderSource()}</span>}

      {linkedExpenses.length > 0
        ? <span className="capture-card-expense-summary">
          <span className="capture-card-category-stack" aria-hidden="true">
            {linkedCategories.slice(0, 4).map(({ id, category }) => <span key={id} className="capture-card-category-badge">
              <CategoryIcon name={category?.name} icon={category?.icon} className="h-4 w-4" size={16} />
            </span>)}
            {linkedCategories.length > 4 && <span className="capture-card-category-more">+{linkedCategories.length - 4}</span>}
          </span>
          <span className="capture-card-expense-count">{expenseCountLabel}</span>
          {parsedCount > linkedExpenses.length && <span className="capture-card-expense-count">{t("capture.parseComplete").replace("{count}", String(parsedCount))}</span>}
          {presentation !== "timeline" && <span className="capture-card-total-label">{t("capture.total")}</span>}
          <span className="capture-card-total-amounts">
            {currencies.map((currency) => <span key={currency} className="capture-card-total-amount">{formatMoney(captureTotal(expenses, capture.id, currency), currency, languageLocale(language))}</span>)}
          </span>
        </span>
        : <span className="capture-card-status" role="status">{status}</span>}

      {captureTags.length > 0 && <span className="capture-card-tags" aria-label={t("expense.tags")}>
        {captureTags.map((tag) => <span key={tag.id} className="capture-card-tag">#{tag.name}</span>)}
      </span>}
    </button>

    {(canRetry || (issue === "signIn" && onSignIn)) && <div className="mt-2 flex flex-wrap items-center gap-2">
      {canRetry && <button type="button" className="control min-h-11 justify-center bg-raised px-3 text-sm font-medium text-text" onClick={onRetry}>
        {issue === "sync" ? t("capture.retrySync") : t("capture.retry")}
      </button>}
      {issue === "signIn" && onSignIn && <button type="button" className="control min-h-11 justify-center bg-accent px-3 text-sm font-semibold text-on-accent" onClick={onSignIn}>{signInLabel ?? t("capture.signInForAi")}</button>}
    </div>}
  </article>;
}
