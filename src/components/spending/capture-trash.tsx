"use client";

import Link from "next/link";

import { ChevronLeft, RotateCcw, Trash2 } from "@/components/icons";
import { formatCompactDate, formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { useAppStore } from "@/lib/app-store";

export function CaptureTrashView() {
  const store = useAppStore();
  const { t, language } = useI18n();
  const captures = store.spendingCaptures
    .filter((capture) => capture.deletedAt && capture.parseStatus !== "undone")
    .sort((left, right) => Date.parse(right.deletedAt ?? right.capturedAt) - Date.parse(left.deletedAt ?? left.capturedAt));

  function permanentlyDelete(captureId: string) {
    if (!window.confirm(t("trash.deleteConfirmation"))) return;
    store.permanentlyDeleteSpendingCapture(captureId);
  }

  return <main className="capture-trash-page">
    <header className="capture-trash-header">
      <Link href="/" className="capture-trash-back"><ChevronLeft className="h-5 w-5" aria-hidden="true" />{t("common.back")}</Link>
      <h1 className="screen-title">{t("trash.title")}</h1>
      <span aria-hidden="true" />
    </header>
    <p className="capture-trash-hint">{t("trash.info")}</p>
    {captures.length ? <ul className="capture-trash-list">
      {captures.map((capture) => {
        const linkedExpenses = store.expenses.filter((expense) => expense.captureId === capture.id && expense.deletedAt === capture.deletedAt);
        const currencyTotals = [...new Set(linkedExpenses.map((expense) => expense.currency))].map((currency) => ({
          currency,
          total: linkedExpenses.filter((expense) => expense.currency === currency).reduce((sum, expense) => sum + expense.amount, 0),
        }));
        return <li key={capture.id} className="capture-trash-note">
          <div className="capture-trash-note-content">
            <time className="capture-trash-date" dateTime={capture.capturedAt}>{formatCompactDate(capture.capturedAt)}</time>
            <p className="capture-trash-source">{capture.sourceText}</p>
            <p className="capture-trash-expense-summary">
              {t("capture.parseComplete").replace("{count}", String(linkedExpenses.length))}
              {currencyTotals.map(({ currency, total }) => <span key={currency}>{formatMoney(total, currency, languageLocale(language))}</span>)}
            </p>
          </div>
          <div className="capture-trash-actions">
            <button type="button" className="capture-trash-restore" onClick={() => store.restoreSpendingCapture(capture.id)}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("trash.restore")}</button>
            <button type="button" className="capture-trash-delete" onClick={() => permanentlyDelete(capture.id)}><Trash2 className="h-4 w-4" aria-hidden="true" />{t("trash.deletePermanently")}</button>
          </div>
        </li>;
      })}
    </ul> : <div className="capture-trash-empty"><Trash2 className="h-8 w-8" aria-hidden="true" /><p>{t("trash.empty")}</p></div>}
  </main>;
}
