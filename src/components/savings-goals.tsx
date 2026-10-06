"use client";

import Link from "next/link";
import { Archive, ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Target, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CategoryIcon } from "@/components/category-icon";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { useAppStore } from "@/lib/app-store";
import { WALLETLY_CURRENCIES } from "@/lib/constants";
import { parseAmountValue } from "@/lib/currency-input";
import { formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { calendarDate, GOAL_ICONS, goalCompletionSnapshot, goalEntries, goalProgress, newlyCompletedByDeposit, type GoalError } from "@/lib/savings-goals";
import type { GoalContribution, SavingsGoal } from "@/lib/types";

function GoalSheet({ title, onClose, children }: { title: string; onClose: () => void; children: (dismiss: () => void) => ReactNode }) {
  const { t } = useI18n();
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeY = useRef<number | null>(null);
  const [closing, setClosing] = useState(false);
  const dismiss = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => closeCallback.current(), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  }, []);

  useLayoutEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop.current && !["SCRIPT", "STYLE"].includes(node.tagName));
    const inertStates = siblings.map((node) => node.inert);
    siblings.forEach((node) => { node.inert = true; });
    (dialog.current?.querySelector<HTMLElement>("[data-autofocus]") ?? dialog.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); dismiss(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href], [tabindex='0']") ?? []).filter((node) => node.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      siblings.forEach((node, index) => { node.inert = inertStates[index]; });
      if (focused?.isConnected) focused.focus();
    };
  }, [dismiss]);

  return createPortal(
    <div ref={backdrop} className={`expense-sheet-backdrop goal-sheet-backdrop fixed inset-0 z-50 flex${closing ? " is-closing" : ""}`} onPointerDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section ref={dialog} className="expense-sheet goal-sheet relative" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div aria-hidden="true" className="flex h-7 touch-none items-center justify-center" onPointerDown={(event) => { swipeY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { if (swipeY.current !== null && event.clientY - swipeY.current > 55) dismiss(); swipeY.current = null; }} onPointerCancel={() => { swipeY.current = null; }}><span className="h-1 w-10 rounded-full bg-muted/40" /></div>
        <header className="flex items-center justify-between gap-3 px-4 pb-3">
          <h2 id={titleId} className="min-w-0 break-words text-xl font-semibold [overflow-wrap:anywhere]">{title}</h2>
          <button type="button" className="icon-button shrink-0" aria-label={t("goals.close")} title={t("goals.close")} onClick={dismiss}><X className="h-5 w-5" /></button>
        </header>
        <div className="goal-sheet-content px-4 pb-5">{children(dismiss)}</div>
      </section>
    </div>, document.body,
  );
}

function GoalDatePicker({ value, onChange, label, optional = false }: { value: string | null; onChange: (value: string | null) => void; label: string; optional?: boolean }) {
  const { t, language } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${value ?? calendarDate()}T12:00:00`));
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (start.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dateLabel = value ? new Date(`${value}T12:00:00`).toLocaleDateString(languageLocale(language)) : t("goals.noDeadline");
  return <div className="grid gap-2">
    <span id={`${id}-label`} className="label">{label}</span>
    <div className="flex items-center gap-2">
      <button type="button" className="input flex min-w-0 items-center justify-between gap-2 text-left" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => setOpen((current) => !current)}><span id={`${id}-value`}>{dateLabel}</span><CalendarDays className="h-5 w-5 shrink-0 text-muted" /></button>
      {optional && value && <button type="button" className="icon-button shrink-0" aria-label={t("goals.clearDeadline")} title={t("goals.clearDeadline")} onClick={() => { onChange(null); setOpen(false); }}><X className="h-4 w-4" /></button>}
    </div>
    {open && <div id={`${id}-calendar`} className="grid gap-2" role="group" aria-label={label} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
      <div className="flex items-center justify-between gap-1">
        <button type="button" className="icon-button" aria-label={t("expense.previousMonth")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-sm font-semibold">{start.toLocaleDateString(languageLocale(language), { month: "long", year: "numeric" })}</span>
        <button type="button" className="icon-button" aria-label={t("expense.nextMonth")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted">{Array.from({ length: 7 }, (_, index) => <span key={index}>{new Intl.DateTimeFormat(languageLocale(language), { weekday: "narrow" }).format(new Date(2024, 0, 1 + index))}</span>)}</div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: offset + days }, (_, index) => {
          if (index < offset) return <span key={index} />;
          const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
          const key = calendarDate(date);
          return <button key={key} type="button" className={`grid min-h-11 place-items-center rounded-full text-sm transition hover:bg-raised${value === key ? " bg-accent-soft text-accent-strong" : ""}`} aria-label={date.toLocaleDateString(languageLocale(language), { dateStyle: "full" })} aria-pressed={value === key} onClick={() => { onChange(key); setOpen(false); }}>{date.getDate()}</button>;
        })}
      </div>
    </div>}
  </div>;
}

function GoalSummary({ goal }: { goal: SavingsGoal }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const status = goalProgress(goal, store.goalContributions);
  const money = (value: number) => formatMoney(value, goal.currency, languageLocale(language));
  return <div className="grid gap-3">
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="text-muted">{goal.currency}</span>
      {goal.archivedAt ? <span className="text-muted">{t("goals.archived")}</span> : status.reached ? <span className="inline-flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" />{t("goals.reached")}</span> : status.overdue ? <span className="text-warning">{t("goals.overdue")}</span> : null}
      {goal.deadline && <span className="ml-auto text-muted">{new Date(`${goal.deadline}T12:00:00`).toLocaleDateString(languageLocale(language))}</span>}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0"><p className="text-xs text-muted">{t("goals.saved")}</p><p className={`mt-1 break-all text-lg font-semibold tabular-nums${status.negativeBalance ? " text-danger" : ""}`}>{money(status.saved)}</p></div>
      <div className="min-w-0 text-right"><p className="text-xs text-muted">{t("goals.remaining")}</p><p className="mt-1 break-all text-lg font-semibold tabular-nums">{money(status.remaining)}</p></div>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={goal.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.percentage)} aria-valuetext={`${money(status.saved)} / ${money(goal.targetAmount)}`}><div className={`goal-progress h-full rounded-full ${status.reached ? "bg-success" : "bg-accent"}`} style={{ width: `${status.percentage}%` }} /></div>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-muted"><span className="tabular-nums">{Math.round(status.percentage)}%</span><span className="break-all">{t("goals.target")}: {money(goal.targetAmount)}</span></div>
    {status.negativeBalance && <p role="alert" className="text-sm text-danger">{t("goals.negativeBalance")}</p>}
  </div>;
}

function GoalForm({ goal, onSaved }: { goal?: SavingsGoal; onSaved: () => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [name, setName] = useState(goal?.name ?? "");
  const [amount, setAmount] = useState(goal ? String(goal.targetAmount) : "");
  const [currency, setCurrency] = useState(goal?.currency ?? store.profile?.currency ?? "USD");
  const [icon, setIcon] = useState<SavingsGoal["icon"]>(goal?.icon ?? "wallet");
  const [deadline, setDeadline] = useState<string | null>(goal?.deadline ?? null);
  const [error, setError] = useState<GoalError | null>(null);
  const submitted = useRef(false);
  const currencyLocked = Boolean(goal && store.goalContributions.some((entry) => entry.goalId === goal.id));
  return <form noValidate className="grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    if (submitted.current) return;
    const targetAmount = parseAmountValue(amount);
    if (targetAmount === null) { setError("goals.amountError"); return; }
    const result = store.saveGoal({ name, targetAmount, currency, icon, deadline }, goal?.id);
    setError(result.error);
    if (!result.error) { submitted.current = true; onSaved(); }
  }}>
    <label className="grid gap-2"><span className="label">{t("goals.name")}</span><input data-autofocus className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
    <label className="grid gap-2"><span className="label">{t("goals.target")}</span><CurrencyAmountInput locale={languageLocale(language)} className="input text-xl font-semibold tabular-nums" value={amount} onValueChange={(value) => setAmount(value)} /></label>
    <fieldset className="min-w-0"><legend className="label mb-2">{t("goals.currency")}</legend><div className="flex gap-2 overflow-x-auto pb-1">{WALLETLY_CURRENCIES.map((item) => <button key={item} type="button" className={`chip shrink-0${currency === item ? " chip-active" : ""}`} aria-pressed={currency === item} disabled={currencyLocked} onClick={() => setCurrency(item)}>{item}</button>)}</div>{currencyLocked && <p className="mt-1 text-xs text-muted">{t("goals.currencyLocked")}</p>}</fieldset>
    <fieldset className="min-w-0"><legend className="label mb-2">{t("goals.icon")}</legend><div className="flex gap-2 overflow-x-auto pb-1">{GOAL_ICONS.map((item) => <button key={item} type="button" className={`icon-button shrink-0${icon === item ? " !bg-accent-soft !text-accent-strong" : ""}`} aria-label={t(`goals.icon.${item}`)} title={t(`goals.icon.${item}`)} aria-pressed={icon === item} onClick={() => setIcon(item)}><CategoryIcon icon={item} /></button>)}</div></fieldset>
    <GoalDatePicker value={deadline} onChange={setDeadline} label={t("goals.deadline")} optional />
    {error && <p role="alert" className="text-sm text-danger">{t(error)}</p>}
    <button type="submit" className="control justify-center bg-text text-bg"><Check className="h-5 w-5" />{t("goals.save")}</button>
  </form>;
}

function ContributionForm({ goal, kind, onSaved }: { goal: SavingsGoal; kind: GoalContribution["kind"]; onSaved: () => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(calendarDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState<GoalError | null>(null);
  const submitted = useRef(false);
  return <form noValidate className="grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    if (submitted.current) return;
    const parsedAmount = parseAmountValue(amount);
    if (parsedAmount === null) { setError("goals.amountError"); return; }
    const result = store.addGoalContribution({ goalId: goal.id, amount: parsedAmount, kind, occurredOn, note });
    setError(result.error);
    if (!result.error) { submitted.current = true; onSaved(); }
  }}>
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong"><CategoryIcon icon={goal.icon} /></span><div className="min-w-0"><p className="break-words font-semibold [overflow-wrap:anywhere]">{goal.name}</p><p className="text-xs text-muted">{t("goals.saved")}: {formatMoney(goalProgress(goal, store.goalContributions).saved, goal.currency, languageLocale(language))}</p></div></div>
    <label className="grid gap-2"><span className="label">{t("goals.amount")} · {goal.currency}</span><CurrencyAmountInput locale={languageLocale(language)} data-autofocus className="amount-input" value={amount} onValueChange={(value) => setAmount(value)} /></label>
    <GoalDatePicker value={occurredOn} onChange={(value) => { if (value) setOccurredOn(value); }} label={t("goals.date")} />
    <label className="grid gap-2"><span className="label">{t("goals.note")}</span><input className="input" value={note} maxLength={160} onChange={(event) => setNote(event.target.value)} /></label>
    {error && <p role="alert" className="text-sm text-danger">{t(error)}</p>}
    <button type="submit" className="control justify-center bg-text text-bg">{kind === "deposit" ? <Plus className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}{t(kind === "deposit" ? "goals.addSavings" : "goals.withdraw")}</button>
  </form>;
}

type GoalPanel = { type: "new" } | { type: "detail" | "edit" | "deposit" | "withdrawal" | "delete"; goalId: string };
type CompletionPanel = { type: "completion"; goalId: string };

const confettiColors = ["#6366F1", "#2E9BC3", "#D59C48", "#B26DD4", "#D95D70", "#248568"];
const confettiVectors = [
  [-164, -124], [-122, -178], [-71, -135], [-20, -205], [30, -150], [84, -186], [139, -129], [179, -171],
  [-190, -28], [-133, 13], [-84, -52], [-35, 44], [36, -35], [89, 28], [144, -23], [197, 31],
  [-158, 121], [-105, 175], [-52, 132], [0, 198], [54, 145], [109, 178], [161, 119], [203, 147],
];

function GoalConfetti() {
  return createPortal(
    <div className="goal-confetti-layer" data-testid="goal-confetti" aria-hidden="true">
      {confettiVectors.map(([x, y], index) => <span key={index} className="goal-confetti-piece" style={{ "--confetti-x": `${x}px`, "--confetti-y": `${y}px`, "--confetti-turn": `${(index % 3 - 1) * 540 + 360}deg`, "--confetti-delay": `${index % 4 * 18}ms`, "--confetti-color": confettiColors[index % confettiColors.length] } as CSSProperties} />)}
    </div>, document.body,
  );
}

export function SavingsGoalsView() {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [archived, setArchived] = useState(false);
  const [panel, setPanel] = useState<GoalPanel | CompletionPanel | null>(null);
  const [completionQueue, setCompletionQueue] = useState<string[]>([]);
  const [celebrationRun, setCelebrationRun] = useState(0);
  const previousCompletion = useRef<Map<string, ReturnType<typeof goalCompletionSnapshot>> | null>(null);
  const activeCompletion = useRef<string | null>(null);
  const restoreArchivedFocus = useRef(false);
  const archivedFilter = useRef<HTMLButtonElement>(null);
  const selectedGoalId = panel && "goalId" in panel ? panel.goalId : undefined;
  const goals = store.savingsGoals.filter((goal) => !goal.deletedAt && Boolean(goal.archivedAt) === archived);
  const selected = selectedGoalId ? store.savingsGoals.find((goal) => goal.id === selectedGoalId && !goal.deletedAt) : undefined;
  const entries = selected ? goalEntries(selected, store.goalContributions).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.updatedAt.localeCompare(a.updatedAt)) : [];
  const title = panel?.type === "new" ? t("goals.new") : panel?.type === "edit" ? t("goals.edit") : panel?.type === "delete" ? t("goals.deleteTitle") : panel?.type === "completion" ? t("goals.reached") : panel?.type === "deposit" ? t("goals.addSavings") : panel?.type === "withdrawal" ? t("goals.withdraw") : selected?.name ?? "";

  useEffect(() => {
    const activeGoals = store.savingsGoals.filter((goal) => !goal.deletedAt && !goal.archivedAt);
    const previous = previousCompletion.current;
    if (previous) {
      const completed = activeGoals.filter((goal) => newlyCompletedByDeposit(goal, store.goalContributions, previous.get(goal.id))).map((goal) => goal.id);
      if (completed.length) setCompletionQueue((current) => [...current, ...completed.filter((id) => !current.includes(id))]);
    }
    previousCompletion.current = new Map(store.savingsGoals.filter((goal) => !goal.deletedAt).map((goal) => [goal.id, goalCompletionSnapshot(goal, store.goalContributions)]));
  }, [store.savingsGoals, store.goalContributions]);

  useEffect(() => {
    if (panel !== null || activeCompletion.current || completionQueue.length === 0) return;
    const goalId = completionQueue[0];
    const goal = store.savingsGoals.find((item) => item.id === goalId && !item.deletedAt && !item.archivedAt);
    if (!goal || !goalProgress(goal, store.goalContributions).reached) {
      setCompletionQueue((current) => current.filter((id) => id !== goalId));
      return;
    }
    activeCompletion.current = goalId;
    setCompletionQueue((current) => current.filter((id) => id !== goalId));
    setPanel({ type: "completion", goalId });
    setCelebrationRun((run) => run + 1);
  }, [panel, completionQueue, store.savingsGoals, store.goalContributions]);

  useEffect(() => {
    if (celebrationRun === 0) return;
    const timer = window.setTimeout(() => setCelebrationRun(0), 1450);
    return () => window.clearTimeout(timer);
  }, [celebrationRun]);

  useLayoutEffect(() => {
    if (panel !== null || !restoreArchivedFocus.current) return;
    restoreArchivedFocus.current = false;
    if (completionQueue.length === 0) archivedFilter.current?.focus();
  }, [panel, completionQueue.length]);

  function closePanel() {
    if (panel?.type === "completion") {
      activeCompletion.current = null;
    }
    setPanel(null);
  }

  return <section className="grid gap-4" aria-label={t("goals.savings")}>
    {store.cloudEnabled && store.syncError && <p role="status" className="text-sm text-warning">{t("goals.syncError")}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="section-title">{t("goals.savings")}</h3><button type="button" className="chip bg-text text-bg" onClick={() => setPanel({ type: "new" })}><Plus className="h-4 w-4" />{t("goals.new")}</button></div>
    <div className="flex flex-wrap gap-2">{[false, true].map((value) => <button key={String(value)} ref={value ? archivedFilter : undefined} type="button" className={`chip${archived === value ? " chip-active" : ""}`} aria-pressed={archived === value} onClick={() => setArchived(value)}>{t(value ? "goals.archived" : "goals.active")}</button>)}</div>
    {goals.length ? <div className="grid items-start gap-3 sm:grid-cols-2">{goals.map((goal) => <article key={goal.id} className="min-w-0 rounded-lg bg-surface p-4">
      <button type="button" className="mb-3 flex min-h-11 w-full items-center gap-3 rounded-lg text-left" aria-label={goal.name} onClick={() => setPanel({ type: "detail", goalId: goal.id })}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong"><CategoryIcon icon={goal.icon} /></span><span className="min-w-0 flex-1 break-words font-semibold [overflow-wrap:anywhere]">{goal.name}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted" /></button>
      <GoalSummary goal={goal} />
      {!archived && <div className="mt-4 flex items-center gap-2"><button type="button" className="chip min-w-0 flex-1 justify-center !rounded-lg !px-2" onClick={() => setPanel({ type: "deposit", goalId: goal.id })}><Plus className="h-4 w-4 shrink-0" /><span>{t("goals.addSavings")}</span></button><button type="button" className="icon-button shrink-0" aria-label={t("goals.withdraw")} title={t("goals.withdraw")} onClick={() => setPanel({ type: "withdrawal", goalId: goal.id })}><ArrowUpRight className="h-5 w-5" /></button></div>}
    </article>)}</div> : <div className="grid justify-items-center gap-3 py-10 text-center"><Target className="h-8 w-8 text-muted" /><p className="text-sm text-muted">{t(archived ? "goals.noArchived" : "goals.empty")}</p></div>}

    {celebrationRun > 0 && <GoalConfetti key={celebrationRun} />}
    {panel && (panel.type === "new" || selected) && <GoalSheet key={`${panel.type}-${selected?.id ?? "new"}`} title={title} onClose={closePanel}>
      {(dismiss) => panel.type === "new" || panel.type === "edit" ? <GoalForm goal={selected} onSaved={dismiss} /> : selected && panel.type === "completion" ? <div className="grid gap-5">
        <div className="grid justify-items-center gap-3 py-2 text-center"><span className="grid h-16 w-16 place-items-center rounded-full border border-success/30 bg-accent-soft text-success"><Check className="h-8 w-8" strokeWidth={2.5} /></span><p className="max-w-sm text-sm leading-6 text-muted">{t("goals.archivePrompt")}</p></div>
        <div className="grid gap-2 sm:grid-cols-2"><button type="button" data-autofocus className="control justify-center bg-raised" onClick={dismiss}>{t("goals.keepActive")}</button><button type="button" className="control justify-center bg-text text-bg" onClick={() => { store.archiveGoal(selected.id, true); setArchived(true); restoreArchivedFocus.current = true; dismiss(); }}><Archive className="h-4 w-4" />{t("goals.archive")}</button></div>
      </div> : selected && (panel.type === "deposit" || panel.type === "withdrawal") ? <ContributionForm goal={selected} kind={panel.type === "deposit" ? "deposit" : "withdrawal"} onSaved={dismiss} /> : selected && panel.type === "delete" ? <div className="grid gap-5"><p className="text-sm leading-6 text-muted">{t("goals.deleteDetail")}</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" data-autofocus className="control justify-center bg-raised" onClick={() => setPanel({ type: "detail", goalId: selected.id })}>{t("common.cancel")}</button><button type="button" className="control goal-destructive justify-center" onClick={() => { store.deleteGoal(selected.id); setPanel(null); }}><Trash2 className="h-4 w-4" />{t("goals.delete")}</button></div></div> : selected && <div className="grid gap-5">
        <GoalSummary goal={selected} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="icon-button" aria-label={t("goals.edit")} title={t("goals.edit")} onClick={() => setPanel({ type: "edit", goalId: selected.id })}><Pencil className="h-4 w-4" /></button>
          <button type="button" className="chip" onClick={() => { store.archiveGoal(selected.id, !selected.archivedAt); setArchived(!selected.archivedAt); setPanel(null); }}>{selected.archivedAt ? <RotateCcw className="h-4 w-4 shrink-0" /> : <Archive className="h-4 w-4 shrink-0" />}{t(selected.archivedAt ? "goals.reopen" : "goals.archive")}</button>
          <button type="button" className="icon-button ml-auto !text-danger" aria-label={t("goals.delete")} title={t("goals.delete")} onClick={() => setPanel({ type: "delete", goalId: selected.id })}><Trash2 className="h-4 w-4" /></button>
        </div>
        {!selected.archivedAt && <div className="grid gap-2"><button type="button" className="control justify-center bg-text text-bg" onClick={() => setPanel({ type: "deposit", goalId: selected.id })}><Plus className="h-5 w-5" />{t("goals.addSavings")}</button><button type="button" className="chip justify-center" onClick={() => setPanel({ type: "withdrawal", goalId: selected.id })}><ArrowUpRight className="h-4 w-4" />{t("goals.withdraw")}</button></div>}
        <section className="grid gap-3"><h3 className="section-title">{t("goals.history")}</h3>{entries.length ? <ul className="grid gap-3">{entries.map((entry) => <li key={entry.id} className="flex items-start gap-3 border-b border-line pb-3"><span className={`mt-1 ${entry.kind === "deposit" ? "text-success" : "text-muted"}`}>{entry.kind === "deposit" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t(entry.kind === "deposit" ? "goals.deposit" : "goals.withdrawal")}</p><p className="text-xs text-muted">{new Date(`${entry.occurredOn}T12:00:00`).toLocaleDateString(languageLocale(language))}</p>{entry.note && <p className="mt-1 break-words text-sm text-muted [overflow-wrap:anywhere]">{entry.note}</p>}</div><span className="max-w-[45%] break-all text-right text-sm font-semibold tabular-nums">{entry.kind === "deposit" ? "+" : "-"}{formatMoney(entry.amount, entry.currency, languageLocale(language))}</span></li>)}</ul> : <p className="text-sm text-muted">{t("goals.noHistory")}</p>}</section>
      </div>}
    </GoalSheet>}
  </section>;
}

export function SavingsGoalsPreview() {
  const store = useAppStore();
  const { t, language } = useI18n();
  const goals = store.savingsGoals.filter((goal) => !goal.deletedAt && !goal.archivedAt).slice(0, 2);
  return <section className="xl:col-span-2" aria-label={t("goals.savings")}>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="section-title">{t("goals.savings")}</h2><Link className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent" href="/insights?tab=goals">{t(goals.length ? "goals.viewAll" : "goals.new")}<ChevronRight className="h-4 w-4" /></Link></div>
    {goals.length ? <div className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => {
      const status = goalProgress(goal, store.goalContributions);
      return <Link key={goal.id} href="/insights?tab=goals" className="flex min-w-0 items-center gap-3 rounded-lg py-2 transition hover:bg-raised"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong"><CategoryIcon icon={goal.icon} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold [overflow-wrap:anywhere]">{goal.name}</span><span className={`text-xs font-semibold tabular-nums ${status.reached ? "text-success" : "text-muted"}`}>{Math.round(status.percentage)}%</span></div><p className="mt-1 break-all text-xs text-muted">{formatMoney(status.saved, goal.currency, languageLocale(language))} / {formatMoney(goal.targetAmount, goal.currency, languageLocale(language))}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-raised"><div className={`goal-progress h-full ${status.reached ? "bg-success" : "bg-accent"}`} style={{ width: `${status.percentage}%` }} /></div></div></Link>;
    })}</div> : <p className="text-sm text-muted">{t("goals.empty")}</p>}
  </section>;
}
