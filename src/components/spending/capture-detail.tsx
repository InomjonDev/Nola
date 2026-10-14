"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { ChevronLeft, Plus, RefreshCw, X } from "@/components/icons";
import type { CaptureParseIssue } from "@/components/spending/capture-card";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { captureParseIssueMessage } from "@/lib/capture-parse-issue";
import { categoryLabel, paymentLabel } from "@/lib/display-labels";
import { formatCompactDate, formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Category, Expense, PaymentMethod, SpendingCapture, SpendingFolder, Tag } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

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
  onEditExpense,
  onSaveSourceText,
  onPauseParsingChange,
  onMoveToFolder,
  onManualEntry,
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
  onReparse?: (sourceText: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onSaveSourceText?: (captureId: string, sourceText: string) => boolean;
  onPauseParsingChange?: (paused: boolean) => void;
  onMoveToFolder?: (captureId: string, folderId: string | null) => void;
  onManualEntry?: (sourceText: string) => void;
}) {
  const { language, t } = useI18n();
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const sourceField = useRef<HTMLTextAreaElement>(null);
  const summaryButton = useRef<HTMLButtonElement>(null);
  const detailsCloseButton = useRef<HTMLButtonElement>(null);
  const [sourceText, setSourceText] = useState(capture.sourceText);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [helpHovered, setHelpHovered] = useState(false);
  const [helpPinned, setHelpPinned] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceTextRef = useRef(capture.sourceText);
  const lastSavedTextRef = useRef(capture.sourceText);
  const activeCaptureIdRef = useRef(capture.id);
  const latestRef = useRef({ captureId: capture.id, sourceText: capture.sourceText, editing: false });
  const saveSourceRef = useRef(onSaveSourceText);
  const pauseParsingRef = useRef(onPauseParsingChange);
  const helpOpen = helpHovered || helpPinned;

  sourceTextRef.current = sourceText;
  latestRef.current = { captureId: activeCaptureIdRef.current, sourceText, editing };
  saveSourceRef.current = onSaveSourceText;
  pauseParsingRef.current = onPauseParsingChange;

  useDialogFocus(dialog, backdrop, leaveNote);

  useEffect(() => {
    if (activeCaptureIdRef.current !== capture.id) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const draft = latestRef.current;
      const trimmed = draft.sourceText.trim();
      if (draft.editing && trimmed && trimmed.length <= 4000 && trimmed !== lastSavedTextRef.current) {
        saveSourceRef.current?.(activeCaptureIdRef.current, trimmed);
      }
      pauseParsingRef.current?.(false);
      activeCaptureIdRef.current = capture.id;
      setSourceText(capture.sourceText);
      sourceTextRef.current = capture.sourceText;
      lastSavedTextRef.current = capture.sourceText;
      setEditing(false);
      setDetailsOpen(false);
      setSaveState("saved");
      setError("");
      return;
    }
    if (!editing) {
      setSourceText(capture.sourceText);
      sourceTextRef.current = capture.sourceText;
      lastSavedTextRef.current = capture.sourceText;
    }
  }, [capture.id, capture.sourceText, editing]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const draft = latestRef.current;
    const trimmed = draft.sourceText.trim();
    if (draft.editing && trimmed && trimmed.length <= 4000 && trimmed !== lastSavedTextRef.current) {
      saveSourceRef.current?.(draft.captureId, trimmed);
    }
    pauseParsingRef.current?.(false);
  }, []);

  useEffect(() => {
    if (!detailsOpen) return;
    detailsCloseButton.current?.focus();
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeExpenseDetails();
    };
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => document.removeEventListener("keydown", dismissOnEscape, true);
  }, [detailsOpen]);

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
        ? captureParseIssueMessage(issue, t)
        : capture.parseStatus === "pending"
          ? issue === "sync" ? t("capture.syncPending") : t("capture.saved")
          : t("capture.saved");
  const canRetry = Boolean(onRetry) && issue !== "signIn" && (capture.parseStatus === "needs_retry" || (capture.parseStatus === "pending" && issue === "sync"));
  const visibleFolders = folders.filter((folder) => !folder.deletedAt).sort((left, right) => left.name.localeCompare(right.name));
  const currencyTotals = [...new Set(activeExpenses.map((expense) => expense.currency))].map((currency) => ({
    currency,
    amount: activeExpenses.filter((expense) => expense.currency === currency).reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const summaryCount = activeExpenses.length
    ? `${activeExpenses.length} ${activeExpenses.length === 1 ? t("history.expense") : t("history.expenses")}`
    : t("capture.noLinkedExpenses");
  const summaryAmounts = currencyTotals.map(({ amount, currency }) => formatMoney(amount, currency, languageLocale(language))).join(" · ");

  function persistSourceText(value: string, targetCaptureId = activeCaptureIdRef.current) {
    const trimmed = value.trim();
    if (!trimmed) { setError(t("capture.textRequired")); setSaveState("idle"); return false; }
    if (trimmed.length > 4000) { setError(t("capture.textTooLong")); setSaveState("idle"); return false; }
    if (trimmed === lastSavedTextRef.current) {
      setSaveState("saved");
      return true;
    }
    if (!saveSourceRef.current || !saveSourceRef.current(targetCaptureId, trimmed)) {
      setError(t("capture.saveError"));
      setSaveState("idle");
      return false;
    }
    lastSavedTextRef.current = trimmed;
    setError("");
    setSaveState("saved");
    return true;
  }

  function flushAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    return persistSourceText(sourceTextRef.current);
  }

  function queueAutoSave(value: string) {
    sourceTextRef.current = value;
    latestRef.current = { captureId: activeCaptureIdRef.current, sourceText: value, editing: true };
    setSourceText(value);
    setEditing(true);
    setError("");
    setSaveState("saving");
    pauseParsingRef.current?.(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persistSourceText(value);
    }, 400);
  }

  function finishEditing() {
    if (!flushAutoSave()) return false;
    setEditing(false);
    latestRef.current = { captureId: activeCaptureIdRef.current, sourceText: sourceTextRef.current, editing: false };
    pauseParsingRef.current?.(false);
    setError("");
    return true;
  }

  function leaveNote() {
    if (editing && !finishEditing()) return;
    pauseParsingRef.current?.(false);
    onClose();
  }

  function closeExpenseDetails() {
    setDetailsOpen(false);
    requestAnimationFrame(() => summaryButton.current?.focus());
  }

  function reparseNote() {
    if (editing && !finishEditing()) return;
    onReparse?.(sourceTextRef.current);
  }

  function addManualExpense() {
    if (editing && !finishEditing()) return;
    onManualEntry?.(sourceTextRef.current);
  }

  function retryParsing() {
    if (editing && !finishEditing()) return;
    closeExpenseDetails();
    onRetry?.();
  }

  function signInToParse() {
    if (editing && !finishEditing()) return;
    closeExpenseDetails();
    onSignIn?.();
  }

  if (typeof document === "undefined") return null;

  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop capture-editor-backdrop fixed inset-0 z-50 flex">
    <article ref={dialog} tabIndex={-1} className="expense-sheet capture-editor" role="dialog" aria-modal="true" aria-labelledby="capture-detail-title">
      <header className="editor-toolbar capture-editor-toolbar">
        <button type="button" className="capture-editor-back" aria-label={closeLabel ?? t("common.back")} title={closeLabel ?? t("common.back")} onClick={leaveNote}><ChevronLeft size={28} aria-hidden="true" /></button>
        <h2 id="capture-detail-title" className="editor-title">{sourceLabel ?? t("capture.noteLabel")}</h2>
        <div className="capture-editor-actions">
          <span className="capture-editor-save-status capture-detail-status" role="status" aria-live="polite">
            {editing ? saveState === "saving" ? t("capture.saving") : saveState === "saved" ? t("capture.autosaved") : "" : status}
          </span>
          <div
            className="capture-editor-help"
            onMouseEnter={() => setHelpHovered(true)}
            onMouseLeave={() => setHelpHovered(false)}
            onFocus={() => setHelpHovered(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHelpHovered(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && helpOpen) {
                event.preventDefault();
                event.stopPropagation();
                setHelpPinned(false);
                setHelpHovered(false);
              }
            }}
          >
            <button type="button" className="capture-editor-help-button" aria-label={t("capture.helpTitle")} aria-expanded={helpOpen} aria-controls="capture-help-popover" aria-describedby={helpOpen ? "capture-help-popover" : undefined} onClick={() => {
              const pinned = !helpPinned;
              setHelpPinned(pinned);
              setHelpHovered(false);
            }}><span aria-hidden="true">?</span></button>
            {helpOpen && <div id="capture-help-popover" className="capture-editor-help-popover" role="tooltip">
              <p>{t("capture.helper")}</p>
              <p>{t("capture.autoSaveHint")}</p>
              <p>{t("capture.privacyShort")}</p>
            </div>}
          </div>
          <button type="button" className="toolbar-action capture-editor-done" onClick={leaveNote}>{t("common.done")}</button>
        </div>
      </header>

      <main className="capture-editor-content">
        <label className="sr-only" htmlFor="capture-detail-source">{sourceLabel ?? t("capture.noteLabel")}</label>
        <textarea
          ref={sourceField}
          id="capture-detail-source"
          name="sourceText"
          data-autofocus
          className="capture-note-body"
          value={sourceText}
          maxLength={4200}
          aria-describedby={helpOpen ? "capture-detail-count capture-help-popover" : "capture-detail-count"}
          onChange={(event) => queueAutoSave(event.target.value)}
        />
        <span id="capture-detail-count" className="capture-editor-character-count">{sourceText.length}/4000</span>
        {error && <p className="capture-editor-error capture-detail-error" role="alert">{error}</p>}
        <button ref={summaryButton} type="button" className="capture-detail-info-pill" aria-label={`${summaryCount}${summaryAmounts ? `, ${summaryAmounts}` : ""}. ${linkedExpensesLabel ?? t("capture.linkedExpenses")}`} aria-expanded={detailsOpen} aria-controls="capture-note-details" onClick={() => setDetailsOpen(true)}>
          <span className="capture-detail-info-count">{summaryCount}</span>
          {summaryAmounts && <><span className="capture-detail-info-separator" aria-hidden="true">·</span><span className="capture-detail-info-total">{summaryAmounts}</span></>}
        </button>
        {onManualEntry && <button type="button" className="capture-editor-add-button" aria-label={t("capture.manualEntry")} onClick={addManualExpense}><Plus className="h-6 w-6" aria-hidden="true" /></button>}
      </main>

      {detailsOpen && <div className="capture-note-details-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeExpenseDetails(); }}>
        <section id="capture-note-details" className="capture-note-details-panel" role="dialog" aria-label={linkedExpensesLabel ?? t("capture.linkedExpenses")}>
          <div className="capture-note-details-handle" aria-hidden="true" />
          <header className="capture-note-details-header">
            <div>
              <h2>{linkedExpensesLabel ?? t("capture.linkedExpenses")}</h2>
              <p>{summaryCount}{summaryAmounts ? ` · ${summaryAmounts}` : ""}</p>
            </div>
            <div className="capture-note-details-actions">
              {onReparse && capture.parseStatus === "parsed" && <button type="button" className="icon-button" aria-label={reparseLabel ?? t("capture.reparse")} onClick={reparseNote}><RefreshCw className="h-5 w-5" aria-hidden="true" /></button>}
              <button ref={detailsCloseButton} type="button" className="icon-button" aria-label={t("common.close")} onClick={closeExpenseDetails}><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
          </header>

          {onMoveToFolder && folderLabel && <label className="capture-note-folder-select">
            <span>{folderLabel}</span>
            <select className="input min-h-11 !rounded-xl" value={capture.folderId ?? ""} onChange={(event) => onMoveToFolder(capture.id, event.target.value || null)}>
              <option value="">{unfiledLabel ?? t("common.all")}</option>
              {visibleFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
            </select>
          </label>}

          {captureTags.length > 0 && <ul className="capture-note-tags" aria-label={t("expense.tags")}>
            {captureTags.map((tag) => <li key={tag.id}>#{tag.name}</li>)}
          </ul>}

          {(canRetry || (issue === "signIn" && onSignIn)) && <div className="capture-note-parse-action">
            <span>{status}</span>
            {issue === "signIn"
              ? <button type="button" className="control min-h-11 justify-center bg-accent px-4 font-semibold text-on-accent" onClick={signInToParse}>{signInLabel ?? t("capture.signInForAi")}</button>
              : <button type="button" className="control min-h-11 justify-center bg-accent px-4 font-semibold text-on-accent" onClick={retryParsing}>{issue === "sync" ? t("capture.retrySync") : t("capture.retry")}</button>}
          </div>}

          {activeExpenses.length === 0
            ? <p className="capture-note-expenses-empty">{emptyExpensesLabel ?? t("capture.emptyExpenses")}</p>
            : <ul className="capture-note-expense-list">
              {activeExpenses.map((expense) => {
                const category = categoryById.get(expense.categoryId);
                const payment = paymentById.get(expense.paymentMethodId);
                const expenseName = expense.note || (category ? categoryLabel(category, t) : t("history.expense"));
                const expenseDate = formatCompactDate(expense.spentAt);
                const expenseAccessibleName = [
                  `${editExpenseLabel ?? t("common.edit")}: ${expenseName}`,
                  expense.quantity !== null ? `${expense.quantity}×` : null,
                  `${t("expense.amount")}: ${formatMoney(expense.amount, expense.currency, languageLocale(language))}`,
                  category ? `${t("expense.category")}: ${categoryLabel(category, t)}` : null,
                  payment ? `${t("expense.paymentMethod")}: ${paymentLabel(payment.name, t)}` : null,
                  `${t("expense.date")}: ${expenseDate}`,
                ].filter(Boolean).join(", ");
                return <li key={expense.id}>
                  <button type="button" aria-label={expenseAccessibleName} onClick={() => onEditExpense?.(expense)}>
                    <CategoryIcon name={category?.name} icon={category?.icon} className="h-5 w-5" size={20} />
                    <span className="capture-note-expense-main">
                      <span className="capture-note-expense-name">{expenseName}{expense.quantity !== null ? <span> · {expense.quantity}×</span> : null}</span>
                      <span className="capture-note-expense-meta">
                        {category && <span>{categoryLabel(category, t)}</span>}
                        {payment && <span>{paymentLabel(payment.name, t)}</span>}
                        <time dateTime={expense.spentAt}>{expenseDate}</time>
                      </span>
                    </span>
                    <span className="capture-note-expense-amount">{formatMoney(expense.amount, expense.currency, languageLocale(language))}</span>
                  </button>
                </li>;
              })}
            </ul>}
        </section>
      </div>}
    </article>
  </div>, document.body);
}
