"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CategoryIcon } from "@/components/category-icon";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { DatePicker, dateFromInput, dateInputValue } from "@/components/date-picker";
import { FloatingAddButton } from "@/components/floating-add-button";
import { ArrowDownLeft, ChevronLeft, ChevronRight, Plus, Trash2 } from "@/components/icons";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { useAppStore } from "@/lib/app-store";
import { activeExpenses, activeIncome, budgetStatus, monthKey, sumAmounts } from "@/lib/budgeting";
import { parseAmountValue } from "@/lib/currency-input";
import { categoryLabel } from "@/lib/display-labels";
import { formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Expense, IncomeEntry } from "@/lib/types";

type Transaction = { kind: "expense"; date: string; entry: Expense } | { kind: "income"; date: string; entry: IncomeEntry };

export function CashFlowView({ onAddExpense, onEditExpense }: { onAddExpense: () => void; onEditExpense: (id: string) => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [incomeEditor, setIncomeEditor] = useState<IncomeEntry | "new" | null>(null);
  const [addMenu, setAddMenu] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const currency = store.profile?.currency ?? "USD";
  const selectedMonth = monthKey(month);
  const expenses = activeExpenses(store.expenses, currency, selectedMonth);
  const income = activeIncome(store.incomeEntries, currency, selectedMonth);
  const spent = sumAmounts(expenses);
  const earned = sumAmounts(income);
  const money = (value: number) => formatMoney(value, currency, languageLocale(language));
  const transactions: Transaction[] = [
    ...expenses.map((entry): Transaction => ({ kind: "expense", date: entry.spentAt, entry })),
    ...income.map((entry): Transaction => ({ kind: "income", date: entry.receivedAt, entry })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const key = new Date(transaction.date).toDateString();
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  useEffect(() => {
    if (!addMenu) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest(".primary-add") || menu.current?.contains(event.target)) return;
      setAddMenu(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setAddMenu(false); document.querySelector<HTMLElement>(".primary-add")?.focus(); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", keyboard); };
  }, [addMenu]);

  return <div className="grid gap-6">
    <div className="month-control">
      <button type="button" className="icon-button" aria-label={t("expense.previousMonth")} onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft size={20} /></button>
      <p className="min-w-0 text-center text-sm font-medium">{month.toLocaleDateString(languageLocale(language), { month: "long", year: "numeric" })}</p>
      <button type="button" className="icon-button" aria-label={t("expense.nextMonth")} onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight size={20} /></button>
    </div>
    <div className="cash-summary">
      <div className="cash-summary-item cash-summary-item--income"><span className="transaction-badge transaction-badge--income">{t("insights.income")}</span><p className="cash-summary-amount">{money(earned)}</p></div>
      <div className="cash-summary-item cash-summary-item--expense"><span className="transaction-badge transaction-badge--expense">{t("insights.expenses")}</span><p className="cash-summary-amount">{money(spent)}</p></div>
    </div>
    <div className="summary-row !min-h-0"><span>{t("insights.balance")}</span><span className="summary-row-amount">{money(earned - spent)}</span></div>
    <section aria-label={t("insights.transactions")}>
      <h3 className="section-title mb-3">{t("insights.transactions")}</h3>
      {Array.from(groups, ([key, entries]) => <section key={key} className="transaction-group" aria-label={new Date(entries[0].date).toLocaleDateString(languageLocale(language), { day: "numeric", month: "short" })}>
        <h4 className="transaction-date">{new Date(entries[0].date).toLocaleDateString(languageLocale(language), { day: "numeric", month: "short" })}</h4>
        {entries.map((transaction) => {
          const category = transaction.kind === "expense" ? store.categories.find((item) => item.id === transaction.entry.categoryId) : undefined;
          const label = transaction.kind === "income" ? t("insights.income") : category ? categoryLabel(category, t) : t("activity.expense");
          const title = transaction.entry.note.trim() || label;
          return <button key={`${transaction.kind}-${transaction.entry.id}`} type="button" className="finance-row" data-kind={transaction.kind} aria-label={`${t("common.edit")}: ${title}, ${transaction.kind === "income" ? t("insights.income") : t("activity.expense")}, ${transaction.kind === "income" ? "+" : "−"}${money(transaction.entry.amount)}`} onClick={() => transaction.kind === "expense" ? onEditExpense(transaction.entry.id) : setIncomeEditor(transaction.entry)}>
            {transaction.kind === "expense" ? <CategoryIcon name={transaction.entry.note} icon={category?.icon} /> : <span className="income-icon-background"><ArrowDownLeft size={20} aria-hidden="true" /></span>}
            <span className="min-w-0"><span className="expense-name">{title}</span><span className={`transaction-badge transaction-badge--${transaction.kind}`}>{transaction.kind === "income" ? t("insights.income") : t("activity.expense")}</span></span>
            <span className="expense-amount">{transaction.kind === "income" ? "+" : "−"}{money(transaction.entry.amount)}</span>
          </button>;
        })}
      </section>)}
      {!transactions.length && <p className="py-4 text-sm text-muted">{t("insights.noTransactions")}</p>}
    </section>
    <SpendingBreakdown expenses={expenses} income={income} currency={currency} />
    <BudgetControls month={selectedMonth} currency={currency} />
    {addMenu && <div ref={menu} id="cash-flow-add-menu" className="add-action-menu" role="group" aria-label={t("common.add")}>
      <button type="button" onClick={() => { setAddMenu(false); onAddExpense(); }}><span className="transaction-badge transaction-badge--expense"><Plus size={16} aria-hidden="true" /></span>{t("expense.addTitle")}</button>
      <button type="button" onClick={() => { setAddMenu(false); setIncomeEditor("new"); }}><span className="transaction-badge transaction-badge--income"><Plus size={16} aria-hidden="true" /></span>{t("insights.addIncome")}</button>
    </div>}
    <FloatingAddButton label={t("common.add")} expanded={addMenu} controls="cash-flow-add-menu" onClick={() => setAddMenu((value) => !value)} />
    {incomeEditor && <IncomeEditor entry={incomeEditor === "new" ? undefined : incomeEditor} onClose={() => setIncomeEditor(null)} onSaved={(date) => { setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setIncomeEditor(null); }} />}
  </div>;
}

function IncomeEditor({ entry, onClose, onSaved }: { entry?: IncomeEntry; onClose: () => void; onSaved: (date: Date) => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [date, setDate] = useState(() => dateInputValue(entry ? new Date(entry.receivedAt) : new Date()));
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, backdrop, onClose);
  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop fixed inset-0 z-50 flex"><section ref={dialog} className="expense-sheet" role="dialog" aria-modal="true" aria-labelledby="income-editor-title" tabIndex={-1}>
    <header className="editor-toolbar"><button type="button" className="toolbar-action" onClick={onClose}>{t("common.cancel")}</button><h2 id="income-editor-title" className="editor-title">{t(entry ? "insights.editIncome" : "insights.addIncome")}</h2><button type="submit" form="income-form" className="toolbar-action" aria-label={t(entry ? "common.saveChanges" : "insights.addIncome")}>{t("common.save")}</button></header>
    <form id="income-form" noValidate className="add-expense-panel grid" onSubmit={(event) => {
      event.preventDefault();
      const parsed = parseAmountValue(amount);
      if (parsed === null) { setError(t("expense.amountError")); return; }
      const receivedAt = dateFromInput(date); receivedAt.setHours(12, 0, 0, 0);
      const id = store.saveIncome({ accountId: entry?.accountId ?? null, recurringRuleId: entry?.recurringRuleId ?? null, amount: parsed, currency: entry?.currency ?? store.profile?.currency ?? "USD", receivedAt: receivedAt.toISOString(), note: note.trim() }, entry?.id);
      if (!id) { setError(t("insights.incomeSaveError")); return; }
      onSaved(receivedAt);
    }}>
      <label className="grid gap-2"><span className="label">{t("expense.amount")}</span><CurrencyAmountInput data-autofocus locale={languageLocale(language)} className="amount-input" value={amount} aria-label={t("insights.addIncome")} aria-invalid={Boolean(error)} onValueChange={(value) => { setAmount(value); setError(null); }} /></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <DatePicker value={date} onChange={setDate} label={t("insights.receivedDate")} />
      <label className="grid gap-2"><span className="label">{t("expense.noteOptional")}</span><input className="input" aria-label={t("expense.noteOptional")} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("expense.notePlaceholder")} /></label>
      {entry && <button type="button" className="control justify-center text-danger" onClick={() => { store.deleteIncome(entry.id); onClose(); }}>{t("insights.removeIncome")}</button>}
    </form>
  </section></div>, document.body);
}

function BudgetControls({ month, currency }: { month: string; currency: string }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(false);
  const status = budgetStatus(store.budgets, store.expenses, currency, month);
  const money = (value: number) => formatMoney(value, currency, languageLocale(language));
  return <section className="grid gap-4 border-t border-line pt-5" aria-label={t("insights.budget")}>
    <h3 className="section-title">{t("insights.budget")}</h3>
    {status ? <>
      <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm text-muted">{money(status.spent)} {t("insights.spentOf")} {money(status.budget.amount)}</p><button type="button" className="icon-button" aria-label={t("insights.removeBudget")} onClick={() => store.deleteBudget(status.budget.id)}><Trash2 size={18} /></button></div>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={t("insights.budget")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, Math.max(0, status.percentage)))}><div className={`h-full rounded-full ${status.remaining < 0 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(100, Math.max(0, status.percentage))}%` }} /></div>
      <p className="text-sm text-muted">{status.remaining < 0 ? t("insights.overBudget").replace("{amount}", money(Math.abs(status.remaining))) : `${t("insights.remaining")}: ${money(status.remaining)}`}</p>
    </> : <p className="text-sm text-muted">{t("insights.noBudget")}</p>}
    <form noValidate className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); const parsed = parseAmountValue(amount); if (parsed === null) { setError(true); return; } store.saveBudget({ amount: parsed, currency, month }); setAmount(""); setError(false); }}>
      <CurrencyAmountInput locale={languageLocale(language)} className="input" aria-label={t("insights.addBudget")} aria-invalid={error} placeholder={t("insights.budgetPlaceholder")} value={amount} onValueChange={(value) => { setAmount(value); setError(false); }} />
      <button type="submit" className="control justify-center text-accent">{t("common.saveChanges")}</button>
      {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{t("expense.amountError")}</p>}
    </form>
  </section>;
}

function SpendingBreakdown({ expenses, income, currency }: { expenses: Expense[]; income: IncomeEntry[]; currency: string }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const total = sumAmounts(expenses);
  const categories = store.categories.map((category) => ({ category, amount: sumAmounts(expenses.filter((entry) => entry.categoryId === category.id)) })).filter((entry) => entry.amount > 0).sort((a,b) => b.amount - a.amount);
  const weeks = Array.from({ length: 5 }, (_, index) => ({ label: `${t("insights.week")} ${index + 1}`, expense: sumAmounts(expenses.filter((entry) => Math.floor((new Date(entry.spentAt).getDate() - 1) / 7) === index)), income: sumAmounts(income.filter((entry) => Math.floor((new Date(entry.receivedAt).getDate() - 1) / 7) === index)) }));
  const max = Math.max(1, ...weeks.flatMap((week) => [week.income, week.expense]));
  return <details className="spending-breakdown"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">{t("insights.whereItWent")}</summary><div className="grid gap-3 pb-4">
    <div className="flex gap-2"><span className="transaction-badge transaction-badge--income">{t("insights.income")}</span><span className="transaction-badge transaction-badge--expense">{t("insights.expenses")}</span></div>
    <div className="chart-bars" role="img" aria-label={weeks.map((week) => `${week.label}: ${t("insights.income")} ${formatMoney(week.income,currency,languageLocale(language))}, ${t("insights.expenses")} ${formatMoney(week.expense,currency,languageLocale(language))}`).join("; ")}>
      {weeks.map((week) => <div key={week.label} className="chart-column"><div className="flex h-24 items-end gap-1"><div className="w-3 rounded-t-md" style={{backgroundColor:"var(--category-green)",height:`${week.income ? Math.max(3,week.income/max*96) : 1}px`}} /><div className="w-3 rounded-t-md" style={{backgroundColor:"var(--category-tangerine)",height:`${week.expense ? Math.max(3,week.expense/max*96) : 1}px`}} /></div><span className="break-words text-center text-xs text-muted">{week.label}</span></div>)}
    </div>
    {categories.map(({category,amount}) => <div key={category.id} className="flex min-w-0 items-center gap-3"><CategoryIcon icon={category.icon} /><div className="min-w-0 flex-1"><p className="text-sm">{categoryLabel(category,t)}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{width:`${total ? amount / total * 100 : 0}%`}} /></div></div><span className="max-w-[45%] break-words text-right text-sm tabular-nums">{formatMoney(amount,currency,languageLocale(language))}</span></div>)}
    {!categories.length && <p className="text-sm text-muted">{t("insights.empty")}</p>}
  </div></details>;
}
