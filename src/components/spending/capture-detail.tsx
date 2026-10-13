"use client";

import { useEffect, useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { ArrowLeft, Pencil, RefreshCw } from "@/components/icons";
import type { CaptureParseIssue } from "@/components/spending/capture-card";
import { useI18n } from "@/lib/i18n-provider";
import { formatMoney } from "@/lib/format";
import { categoryLabel, paymentLabel } from "@/lib/display-labels";
import { languageLocale } from "@/lib/i18n";
import type { Category, Expense, PaymentMethod, SpendingCapture, SpendingFolder, Tag } from "@/lib/types";

export function CaptureDetail({
  capture,
  expenses,
  categories,
  paymentMethods,
  tags,
  folders = [],
  issue,
  sourceLabel,
  linkedExpensesLabel,
  emptyExpensesLabel,
  folderLabel,
  unfiledLabel,
  closeLabel,
  reparseLabel,
  editExpenseLabel,
  signInLabel,
  onClose,
  onRetry,
  onSignIn,
  onReparse,
  onUndo,
  onEditExpense,
  onSaveSourceText,
  onMoveToFolder,
}: {
  capture: SpendingCapture;
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  tags: Tag[];
  folders?: SpendingFolder[];
  issue?: CaptureParseIssue;
  sourceLabel?: string;
  linkedExpensesLabel?: string;
  emptyExpensesLabel?: string;
  folderLabel?: string;
  unfiledLabel?: string;
  closeLabel?: string;
  reparseLabel?: string;
  editExpenseLabel?: string;
  signInLabel?: string;
  onClose: () => void;
  onRetry?: () => void;
  onSignIn?: () => void;
  onReparse?: () => void;
  onUndo?: () => void;
  onEditExpense?: (expense: Expense) => void;
  onSaveSourceText?: (captureId: string, sourceText: string) => boolean;
  onMoveToFolder?: (captureId: string, folderId: string | null) => void;
}) {
  const { language, t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [sourceText, setSourceText] = useState(capture.sourceText);
  const [error, setError] = useState("");
  useEffect(() => {
    setSourceText(capture.sourceText);
    setEditing(false);
    setError("");
  }, [capture.id, capture.sourceText]);

  const activeExpenses = expenses.filter((expense) => expense.captureId === capture.id && !expense.deletedAt)
    .sort((left, right) => Date.parse(right.spentAt) - Date.parse(left.spentAt));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const paymentById = new Map(paymentMethods.map((method) => [method.id, method]));
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const captureTags = capture.tagIds.flatMap((id) => {
    const tag = tagById.get(id);
    return tag ? [tag] : [];
  });
  const status = capture.parseStatus === "processing"
    ? t("capture.processing")
    : capture.parseStatus === "parsed"
      ? t("capture.parseComplete").replace("{count}", String(activeExpenses.length))
      : capture.parseStatus === "needs_retry"
        ? issue === "signIn"
          ? t("capture.needsSignIn")
          : issue === "sync"
            ? t("capture.syncPending")
            : t("capture.retryDetail")
        : capture.parseStatus === "pending"
          ? issue === "sync" ? t("capture.syncPending") : t("capture.saved")
          : t("capture.saved");
  const canRetry = Boolean(onRetry) && issue !== "signIn" && (capture.parseStatus === "needs_retry" || (capture.parseStatus === "pending" && issue === "sync"));
  const visibleFolders = folders.filter((folder) => !folder.deletedAt).sort((left, right) => left.name.localeCompare(right.name));

  function saveSourceText() {
    const trimmed = sourceText.trim();
    if (!trimmed) { setError(t("capture.textRequired")); return; }
    if (trimmed.length > 4000) { setError(t("capture.textTooLong")); return; }
    if (!onSaveSourceText || !onSaveSourceText(capture.id, trimmed)) { setError(t("capture.saveError")); return; }
    setSourceText(trimmed);
    setEditing(false);
    setError("");
  }

  return <article className="mx-auto grid w-full max-w-3xl gap-6 pb-16">
    <header className="sticky top-0 z-10 -mx-4 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <button type="button" className="control min-h-11 justify-center gap-2 bg-raised px-3 text-sm font-medium text-text" onClick={onClose}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{closeLabel ?? t("common.close")}
      </button>
      <div className="flex items-center gap-2">
        {!editing && onSaveSourceText && <button type="button" className="control min-h-11 justify-center gap-2 bg-raised px-3 text-sm font-medium text-text" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" aria-hidden="true" />{t("common.edit")}
        </button>}
        {!editing && onReparse && reparseLabel && capture.parseStatus === "parsed" && <button type="button" className="control min-h-11 justify-center gap-2 bg-raised px-3 text-sm font-medium text-text" onClick={onReparse}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />{reparseLabel}
        </button>}
        {onUndo && <button type="button" className="control min-h-11 justify-center px-3 text-sm font-medium text-muted" onClick={onUndo}>{t("history.undo")}</button>}
      </div>
    </header>

    <section className="grid gap-4 px-1" aria-labelledby="capture-detail-title">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
        <time dateTime={capture.capturedAt}>{new Date(capture.capturedAt).toLocaleString(languageLocale(language), { dateStyle: "full", timeStyle: "short" })}</time>
        <span aria-hidden="true">·</span><span role="status">{status}</span>
      </div>
      <h1 id="capture-detail-title" className="sr-only">{sourceLabel ?? t("capture.noteLabel")}</h1>
      {editing
        ? <div className="grid gap-3">
          <label className="sr-only" htmlFor="capture-detail-source">{sourceLabel ?? t("capture.noteLabel")}</label>
          <textarea id="capture-detail-source" autoFocus className="input min-h-[220px] resize-y !rounded-2xl !border-0 !bg-surface !px-4 !py-4 text-lg leading-8" value={sourceText} maxLength={4200} aria-describedby="capture-detail-count" onChange={(event) => { setSourceText(event.target.value); setError(""); }} />
          <div className="flex items-center justify-between gap-3">
            <span id="capture-detail-count" className="text-xs tabular-nums text-muted">{sourceText.length}/4000</span>
            <div className="flex gap-2">
              <button type="button" className="control min-h-11 justify-center bg-raised px-4 text-text" onClick={() => { setSourceText(capture.sourceText); setEditing(false); setError(""); }}>{t("common.cancel")}</button>
              <button type="button" className="control min-h-11 justify-center bg-accent px-4 font-semibold text-on-accent" disabled={sourceText.trim() === capture.sourceText.trim()} onClick={saveSourceText}>{t("common.saveChanges")}</button>
            </div>
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        </div>
        : <p className="whitespace-pre-wrap break-words text-xl leading-8 text-text [overflow-wrap:anywhere]">{capture.sourceText}</p>}

      {captureTags.length > 0 && <ul className="flex flex-wrap gap-2" aria-label={t("expense.tags")}>
        {captureTags.map((tag) => <li key={tag.id} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">#{tag.name}</li>)}
      </ul>}

      {onMoveToFolder && folderLabel && <label className="grid max-w-sm gap-1.5 text-sm font-medium text-muted">
        <span>{folderLabel}</span>
        <select className="input min-h-11 !rounded-xl" value={capture.folderId ?? ""} onChange={(event) => onMoveToFolder(capture.id, event.target.value || null)}>
          <option value="">{unfiledLabel ?? t("common.all")}</option>
          {visibleFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
      </label>}
    </section>

    {(canRetry || (issue === "signIn" && onSignIn)) && <section className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4" aria-label={status}>
      <p className="min-w-0 flex-1 text-sm leading-6 text-muted">{status}</p>
      {issue === "signIn"
        ? <button type="button" className="control min-h-11 justify-center bg-accent px-4 font-semibold text-on-accent" onClick={onSignIn}>{signInLabel ?? t("capture.signInForAi")}</button>
        : <button type="button" className="control min-h-11 justify-center bg-accent px-4 font-semibold text-on-accent" onClick={onRetry}>{issue === "sync" ? t("capture.retrySync") : t("capture.retry")}</button>}
    </section>}

    <section aria-labelledby="capture-linked-expenses" className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="capture-linked-expenses" className="text-base font-semibold tracking-tight text-text">{linkedExpensesLabel ?? t("history.expenses")}</h2>
        {activeExpenses.length > 0 && <span className="text-sm tabular-nums text-muted">{activeExpenses.length}</span>}
      </div>
      {activeExpenses.length === 0
        ? <p className="px-1 py-3 text-sm leading-6 text-muted">{emptyExpensesLabel ?? status}</p>
        : <ul className="min-w-0 rounded-2xl bg-surface px-4 sm:px-5">
          {activeExpenses.map((expense) => {
            const category = categoryById.get(expense.categoryId);
            const payment = paymentById.get(expense.paymentMethodId);
            const expenseName = expense.note || (category ? categoryLabel(category, t) : t("history.expense"));
            const expenseDate = new Date(expense.spentAt).toLocaleDateString(languageLocale(language), { dateStyle: "medium" });
            const expenseAccessibleName = [
              `${editExpenseLabel ?? t("common.edit")}: ${expenseName}`,
              expense.quantity !== null ? `${expense.quantity}×` : null,
              `${t("expense.amount")}: ${formatMoney(expense.amount, expense.currency, languageLocale(language))}`,
              category ? `${t("expense.category")}: ${categoryLabel(category, t)}` : null,
              payment ? `${t("expense.paymentMethod")}: ${paymentLabel(payment.name, t)}` : null,
              `${t("expense.date")}: ${expenseDate}`,
            ].filter(Boolean).join(", ");
            const rowContent = <>
              <CategoryIcon name={category?.name} icon={category?.icon} className="mt-0.5 h-4 w-4" size={16} />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold text-text [overflow-wrap:anywhere]">{expenseName}{expense.quantity !== null ? <span className="ml-1 font-normal text-muted">· {expense.quantity}×</span> : null}</span>
                <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted">
                  {category && <span>{categoryLabel(category, t)}</span>}
                  {payment && <span>{paymentLabel(payment.name, t)}</span>}
                  <time dateTime={expense.spentAt}>{expenseDate}</time>
                </span>
              </span>
              <span className="max-w-[45%] break-all text-right text-sm font-semibold tabular-nums text-text">{formatMoney(expense.amount, expense.currency, languageLocale(language))}</span>
            </>;
            const expenseRowClass = "flex min-h-11 w-full min-w-0 items-start gap-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";
            return <li key={expense.id} className="border-b border-line last:border-b-0">
              {onEditExpense
                ? <button type="button" className={expenseRowClass} aria-label={expenseAccessibleName} onClick={() => onEditExpense(expense)}>{rowContent}</button>
                : <div className={expenseRowClass}>{rowContent}</div>}
            </li>;
          })}
        </ul>}
    </section>
  </article>;
}
