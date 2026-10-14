"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { CategoryIcon, categoryAccent } from "@/components/category-icon";
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
import type { Category, Expense, IncomeEntry } from "@/lib/types";

type Transaction = { kind: "expense"; date: string; entry: Expense } | { kind: "income"; date: string; entry: IncomeEntry };

export function CashFlowView({ onAddExpense, onEditExpense }: { onAddExpense: () => void; onEditExpense: (id: string) => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
    <SpendingCategoryChart expenses={expenses} categories={store.categories} currency={currency} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
    <section className="cash-flow-summary" aria-label={t("insights.overview")}>
      <div className="cash-flow-summary-main">
        <span className="cash-flow-summary-label">{t("insights.balance")}</span>
        <p className="cash-flow-summary-balance">{money(earned - spent)}</p>
      </div>
      <div className="cash-flow-summary-metrics">
        <div className="cash-flow-summary-metric">
          <span className="cash-flow-summary-dot cash-flow-summary-dot--income" aria-hidden="true" />
          <span className="cash-flow-summary-metric-label">{t("insights.income")}</span>
          <span className="cash-flow-summary-metric-value">{money(earned)}</span>
        </div>
        <div className="cash-flow-summary-metric">
          <span className="cash-flow-summary-dot cash-flow-summary-dot--expense" aria-hidden="true" />
          <span className="cash-flow-summary-metric-label">{t("insights.expenses")}</span>
          <span className="cash-flow-summary-metric-value">{money(spent)}</span>
        </div>
      </div>
    </section>
    <section aria-label={t("insights.transactions")}>
      <h3 className="section-title mb-3">{t("insights.transactions")}</h3>
      {Array.from(groups, ([key, entries]) => <section key={key} className="transaction-group" aria-label={new Date(entries[0].date).toLocaleDateString(languageLocale(language), { day: "numeric", month: "short" })}>
        <h4 className="transaction-date">{new Date(entries[0].date).toLocaleDateString(languageLocale(language), { day: "numeric", month: "short" })}</h4>
        {entries.map((transaction) => {
          const category = transaction.kind === "expense" ? store.categories.find((item) => item.id === transaction.entry.categoryId) : undefined;
          const label = transaction.kind === "income" ? t("insights.income") : category ? categoryLabel(category, t) : t("activity.expense");
          const description = transaction.entry.note.trim();
          const title = description || label;
          const detail = description && description.toLocaleLowerCase(languageLocale(language)) !== label.toLocaleLowerCase(languageLocale(language)) ? label : "";
          return <button key={`${transaction.kind}-${transaction.entry.id}`} type="button" className="finance-row" data-kind={transaction.kind} aria-label={`${t("common.edit")}: ${title}, ${transaction.kind === "income" ? t("insights.income") : t("activity.expense")}, ${transaction.kind === "income" ? "+" : "−"}${money(transaction.entry.amount)}`} onClick={() => transaction.kind === "expense" ? onEditExpense(transaction.entry.id) : setIncomeEditor(transaction.entry)}>
            {transaction.kind === "expense" ? <CategoryIcon name={transaction.entry.note} icon={category?.icon} /> : <span className="income-icon-background"><ArrowDownLeft size={20} aria-hidden="true" /></span>}
            <span className="finance-row-copy"><span className="expense-name">{title}</span>{detail && <span className="finance-row-detail">{detail}</span>}</span>
            <span className="expense-amount">{transaction.kind === "income" ? "+" : "−"}{money(transaction.entry.amount)}</span>
          </button>;
        })}
      </section>)}
      {!transactions.length && <p className="py-4 text-sm text-muted">{t("insights.noTransactions")}</p>}
    </section>
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
  return <section className="budget-controls" aria-label={t("insights.budget")}>
    <h3 className="section-title">{t("insights.budget")}</h3>
    {status ? <>
      <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm text-muted">{money(status.spent)} {t("insights.spentOf")} {money(status.budget.amount)}</p><button type="button" className="icon-button" aria-label={t("insights.removeBudget")} onClick={() => store.deleteBudget(status.budget.id)}><Trash2 size={18} /></button></div>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={t("insights.budget")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, Math.max(0, status.percentage)))}><div className={`h-full rounded-full ${status.remaining < 0 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(100, Math.max(0, status.percentage))}%` }} /></div>
      <p className="text-sm text-muted">{status.remaining < 0 ? t("insights.overBudget").replace("{amount}", money(Math.abs(status.remaining))) : `${t("insights.remaining")}: ${money(status.remaining)}`}</p>
    </> : <p className="text-sm text-muted">{t("insights.noBudget")}</p>}
    <form noValidate className="budget-form" onSubmit={(event) => { event.preventDefault(); const parsed = parseAmountValue(amount); if (parsed === null) { setError(true); return; } store.saveBudget({ amount: parsed, currency, month }); setAmount(""); setError(false); }}>
      <CurrencyAmountInput locale={languageLocale(language)} className="input budget-input" aria-label={t("insights.addBudget")} aria-invalid={error} placeholder={t("insights.budgetPlaceholder")} value={amount} onValueChange={(value) => { setAmount(value); setError(false); }} />
      <button type="submit" className="control budget-save">{t("common.saveChanges")}</button>
      {error && <p role="alert" className="budget-error text-sm text-danger">{t("expense.amountError")}</p>}
    </form>
  </section>;
}

function SpendingCategoryChart({ expenses, categories, currency, selectedCategoryId, onSelectCategory }: { expenses: Expense[]; categories: Category[]; currency: string; selectedCategoryId: string | null; onSelectCategory: (id: string | null) => void }) {
  const { t, language } = useI18n();
  const total = sumAmounts(expenses);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const amounts = new Map<string, number>();
  for (const expense of expenses) {
    const id = categoryById.has(expense.categoryId) ? expense.categoryId : "uncategorized";
    amounts.set(id, (amounts.get(id) ?? 0) + expense.amount);
  }
  const slices = [...amounts].map(([id, amount]) => {
    const category = categoryById.get(id);
    return { id, amount, category, label: category ? categoryLabel(category, t) : t("activity.expense"), icon: category?.icon };
  }).sort((a, b) => b.amount - a.amount);
  const selected = slices.find((slice) => slice.id === selectedCategoryId);
  const centerLabel = selected?.label ?? t("insights.expenses");
  const centerAmount = selected?.amount ?? total;
  const centerShare = selected && total > 0 ? new Intl.NumberFormat(languageLocale(language), { style: "percent", maximumFractionDigits: 0 }).format(selected.amount / total) : null;
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const segmentGap = 8;
  let offset = 0;
  const money = (value: number) => formatMoney(value, currency, languageLocale(language));

  function toggleSlice(id: string) {
    onSelectCategory(selectedCategoryId === id ? null : id);
  }

  function handleSliceKeyDown(event: ReactKeyboardEvent<SVGCircleElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleSlice(id);
  }

  return <section className="spending-category-chart" aria-label={t("insights.whereItWent")}>
    <div className="category-donut">
      <svg viewBox="0 0 220 220" role="group" aria-label={t("insights.whereItWent")}>
        <circle className="category-donut-track" cx="110" cy="110" r={radius} fill="none" stroke="rgb(var(--color-line))" strokeWidth="18" aria-hidden="true" />
        {total > 0 && slices.map((slice, index) => {
          const length = circumference * slice.amount / total;
          const segmentOffset = offset;
          offset += length;
          const active = selectedCategoryId === slice.id;
          const strokeWidth = Math.min(active ? 23 : 18, length * 0.42);
          const gap = Math.min(segmentGap, length * 0.16);
          const dashLength = Math.max(0, length - gap - strokeWidth);
          if (dashLength <= 0) return null;
          const dashOffset = -(segmentOffset + gap / 2 + strokeWidth / 2);
          return <circle
            key={slice.id}
            className={`category-donut-segment${active ? " category-donut-segment-active" : ""}${selected && !active ? " category-donut-segment-dimmed" : ""}`}
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={categoryAccent(slice.icon)}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            style={{ animationDelay: `${index * 32}ms` }}
            role="button"
            tabIndex={0}
            aria-label={`${slice.label}: ${money(slice.amount)}, ${centerShareLabel(slice.amount, total, languageLocale(language))}`}
            aria-pressed={active}
            onClick={() => toggleSlice(slice.id)}
            onKeyDown={(event) => handleSliceKeyDown(event, slice.id)}
          />;
        })}
      </svg>
      <div className="category-donut-center" aria-live="polite">
        <span className="category-donut-label">{centerLabel}</span>
        <span className="category-donut-amount">{money(centerAmount)}</span>
        {centerShare && <span className="category-donut-share">{centerShare} {t("insights.shareOfSpending")}</span>}
      </div>
    </div>
    {slices.length ? <div className="category-chart-legend">
      {slices.map((slice) => <button key={slice.id} type="button" className={`category-chart-legend-row${selectedCategoryId === slice.id ? " category-chart-legend-row-active" : ""}`} aria-pressed={selectedCategoryId === slice.id} onClick={() => toggleSlice(slice.id)}>
        <span className="category-chart-swatch" style={{ backgroundColor: categoryAccent(slice.icon) }} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{slice.label}</span>
        <span className="shrink-0 text-right tabular-nums">{money(slice.amount)}</span>
      </button>)}
    </div> : <p className="category-chart-empty">{t("insights.empty")}</p>}
  </section>;
}

function centerShareLabel(amount: number, total: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(total > 0 ? amount / total : 0);
}
