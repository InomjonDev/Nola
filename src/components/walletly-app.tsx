"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronLeft, ChevronRight, Clock3, Cloud, Download, Eye, EyeOff, Home, LineChart, ListFilter, LogOut, Moon, Pencil, Plus, RefreshCw, Search, Settings, Shield, ShieldCheck, SlidersHorizontal, Sun, Tags, Trash2, User, WalletCards, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { CategoryIcon, categoryIconNames } from "@/components/category-icon";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { GoogleLogo } from "@/components/google-logo";
import { SavingsGoalsPreview, SavingsGoalsView } from "@/components/savings-goals";
import { consumeRollingWindow, formatShortCountdown } from "@/lib/action-rate-limit";
import { CONSENT_KEY, COOKIE_CONSENT_KEY, DEFAULT_PAYMENT_METHODS, WALLETLY_CURRENCIES } from "@/lib/constants";
import { formatExpenseDate, formatMoney } from "@/lib/format";
import { parseAmountValue } from "@/lib/currency-input";
import { exportWalletlyData } from "@/lib/export-data";
import { activeExpenses, activeIncome, budgetStatus, monthKey, sumAmounts } from "@/lib/budgeting";
import { languageLocale, type TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { notificationsEnabled, setDailyReminderEnabled } from "@/lib/notifications";
import { useAppStore } from "@/lib/app-store";
import type { CategoryIconName, Expense } from "@/lib/types";
import { useLedgerTheme } from "@/theme/theme-provider";

type View = "home" | "add" | "history" | "insights" | "manage" | "profile" | "settings";

const navItems = [
  { href: "/", view: "home", labelKey: "nav.home", icon: Home },
  { href: "/history", view: "history", labelKey: "nav.activity", icon: ListFilter },
  { href: "/insights", view: "insights", labelKey: "nav.insights", icon: LineChart },
  { href: "/profile", view: "profile", labelKey: "nav.profile", icon: User },
] as const;

function visibleExpenses(expenses: Expense[]) {
  return expenses.filter((expense) => !expense.deletedAt).sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek() {
  const date = new Date();
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ActivePill({ index, count, variant = "default" }: { index: number; count: number; variant?: "default" | "segment" | "vertical" }) {
  return <span aria-hidden="true" className={cx("active-pill", variant === "segment" && "active-pill--segment", variant === "vertical" && "active-pill--vertical")} style={{ "--active-index": index, "--active-count": count } as CSSProperties} />;
}

export function WalletlyApp({ view, overlay }: { view: View; overlay?: "add" }) {
  const store = useAppStore();
  const { t } = useI18n();
  const router = useRouter();
  const [expenseSheet, setExpenseSheet] = useState<string | "new" | null>(() => overlay === "add" ? "new" : null);
  const needsAuth = store.hydrated && !store.user;
  const needsOnboarding = store.hydrated && store.user && !store.profile && view !== "settings";

  function openExpenseSheet(editId?: string) {
    setExpenseSheet(editId ?? "new");
  }

  function closeExpenseSheet() {
    setExpenseSheet(null);
    if (overlay) router.back();
  }

  if (!store.hydrated) {
    return <div className="grid min-h-dvh place-items-center px-6 text-muted">{t("common.loading")}</div>;
  }

  if (needsAuth) return <AuthScreen />;
  if (needsOnboarding) return <OnboardingScreen />;

  return (
    <div className="min-h-dvh bg-bg text-text transition-colors duration-300">
      <DesktopNav active={view} onAddExpense={openExpenseSheet} />
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-28 pt-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:pb-10 lg:pt-8">
        <aside className="hidden lg:block" />
        <section className="min-w-0">
          <TopBar />
          {view === "home" && <HomeView onAddExpense={openExpenseSheet} onEditExpense={openExpenseSheet} />}
          {view === "add" && <ExpenseForm onSaved={() => router.push("/history")} />}
          {view === "history" && <HistoryView onEditExpense={openExpenseSheet} />}
          {view === "insights" && <InsightsView />}
          {view === "manage" && <ManageView />}
          {view === "profile" && <ProfileView />}
          {view === "settings" && <SettingsView />}
        </section>
      </main>
      <MobileNav active={view} onAddExpense={openExpenseSheet} />
      {expenseSheet && <ExpenseSheet editId={expenseSheet === "new" ? undefined : expenseSheet} onClose={closeExpenseSheet} />}
      <ConsentBanner />
      <InstallPrompt />
      <div className="sr-only" aria-live="polite">
        {!store.isOnline ? t("settings.offline") : store.isSyncing ? t("settings.syncing") : t("settings.upToDate")}
      </div>
    </div>
  );
}

function AuthScreen() {
  const store = useAppStore();
  const { t } = useI18n();
  const [message, setMessage] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitGoogle() {
    setBusy(true);
    setMessage(false);
    try {
      await store.signInSocial("google");
    } catch {
      setMessage(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitDemo() {
    await store.signInDemo();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-3 text-text sm:py-8">
      <section className="w-full max-w-md rounded-[28px] bg-surface p-4 shadow-soft sm:p-8">
        <div className="mb-6 sm:mb-8">
          <img src="/branding/walletly-mascot.png" alt="Walletly" className="h-auto w-44 rounded-2xl bg-white p-2 shadow-sm sm:w-52" />
          <h1 className="sr-only">Walletly</h1>
          <p className="mt-3 text-sm text-muted">{t("auth.description")}</p>
        </div>
        <button className="control w-full justify-center bg-text text-bg" disabled={busy} onClick={() => void submitGoogle()}>
          <GoogleLogo /> {t("auth.continueGoogle")}
        </button>
        <button className="control mt-3 w-full justify-center bg-raised text-text" disabled={busy} onClick={() => void submitDemo()}>
          {t("auth.tryDemo")}
        </button>
        {message && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{t("auth.googleError")}</p>}
        <p className="mt-6 text-xs leading-5 text-muted">{t("auth.consent")}</p>
      </section>
    </main>
  );
}

function OnboardingScreen() {
  const store = useAppStore();
  const { t } = useI18n();
  const [currency, setCurrency] = useState("USD");
  const [payment, setPayment] = useState<string>(DEFAULT_PAYMENT_METHODS[0]);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-8 text-text">
      <section className="w-full max-w-lg rounded-[28px] bg-surface p-6 shadow-soft">
        <p className="eyebrow">{t("onboarding.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t("onboarding.title")}</h1>
        <div className="mt-6">
          <p className="label">{t("onboarding.currency")}</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {WALLETLY_CURRENCIES.map((item) => (
              <button key={item} className={cx("chip min-w-0 justify-center px-3", currency === item && "chip-active")} onClick={() => setCurrency(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <p className="label">{t("onboarding.payment")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEFAULT_PAYMENT_METHODS.map((item) => (
              <button key={item} className={cx("control min-w-0 justify-center gap-2 whitespace-nowrap bg-raised px-3 text-sm sm:px-4 sm:text-base", payment === item && "ring-2 ring-accent")} onClick={() => setPayment(item)}>
                <span>{item}</span>{payment === item && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        <button className="control mt-8 w-full justify-center bg-text text-bg" onClick={() => store.completeOnboarding(currency, payment)}>{t("onboarding.enter")}</button>
      </section>
    </main>
  );
}

function DesktopNav({ active, onAddExpense }: { active: View; onAddExpense: () => void }) {
  const { t } = useI18n();
  const items = [...navItems, { href: "/settings", view: "settings", labelKey: "nav.settings", icon: Settings } as const];
  const activeIndex = items.findIndex((item) => item.view === active);
  return (
    <nav className="fixed left-6 top-6 z-20 hidden w-56 rounded-[24px] bg-surface/88 p-3 shadow-soft backdrop-blur-xl lg:block">
      <Link href="/" className="mb-6 flex items-center gap-3 px-2 py-2">
        <img src="/branding/walletly-mascot.png" alt="" className="h-10 w-10 rounded-xl bg-white object-cover p-0.5" />
        <span className="text-lg font-bold">Walletly</span>
      </Link>
      <div className="relative grid gap-1">
        {activeIndex >= 0 && <ActivePill index={activeIndex} count={items.length} variant="vertical" />}
        {items.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={cx("relative z-10 flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold text-muted transition hover:text-text", active === item.view && "text-accent-strong")}>
            <Icon className="h-5 w-5" /> {t(item.labelKey as TranslationKey)}
          </Link>;
        })}
      </div>
      <button type="button" onClick={() => onAddExpense()} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-text px-4 text-sm font-semibold text-bg shadow-soft transition hover:opacity-85">
        <Plus className="h-5 w-5" /> {t("nav.addExpense")}
      </button>
    </nav>
  );
}

function MobileNav({ active, onAddExpense }: { active: View; onAddExpense: () => void }) {
  const { t } = useI18n();
  const activeIndex = navItems.findIndex((item) => item.view === active);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <div className="relative flex min-h-[70px] flex-1 items-center justify-between rounded-full border border-white/30 bg-surface/78 p-1.5 shadow-glass backdrop-blur-2xl">
        {activeIndex >= 0 && <ActivePill index={activeIndex} count={navItems.length} />}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-label={t(item.labelKey)} className={cx("relative z-10 grid h-14 min-w-[58px] flex-1 place-items-center rounded-full text-muted transition", active === item.view && "text-text")}>
              <Icon className="h-5 w-5" strokeWidth={active === item.view ? 2.3 : 1.8} />
              <span className="sr-only">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        </div>
        <button type="button" aria-label={t("nav.addExpense")} onClick={() => onAddExpense()} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-text text-bg shadow-soft transition hover:opacity-85">
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </nav>
  );
}

function TopBar() {
  const store = useAppStore();
  const { t } = useI18n();
  const name = store.user?.name?.trim() || "there";
  const greeting = name === "there" ? name : name.split(/\s+/)[0];
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-sm font-bold text-accent">
          {store.user?.avatarUrl ? <img src={store.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : greeting === "there" ? <img src="/branding/walletly-mascot.png" alt="" className="h-full w-full object-cover" /> : greeting.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-muted">{t("topbar.welcome")}</p>
          <h1 className="truncate text-[17px] font-semibold">{greeting}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden min-h-8 items-center gap-1.5 rounded-full bg-raised px-3 text-[11px] font-bold text-muted sm:flex">
          <span className={cx("h-1.5 w-1.5 rounded-full", !store.isOnline ? "bg-warning" : store.syncQueue.length ? "bg-accent" : "bg-success")} />
          {!store.isOnline ? t("topbar.offline") : store.syncQueue.length ? t("topbar.syncing") : t("topbar.synced")}
        </span>
        <button aria-label={t("nav.refreshSync")} className="icon-button" onClick={store.retrySync}>
          <RefreshCw className={cx("h-5 w-5", store.isSyncing && "animate-spin")} />
        </button>
        <button aria-label={t("nav.notifications")} className="icon-button hidden sm:grid"><Bell className="h-5 w-5" /></button>
      </div>
    </header>
  );
}

function HomeView({ onAddExpense, onEditExpense }: { onAddExpense: () => void; onEditExpense: (id: string) => void }) {
  const store = useAppStore();
  const { t } = useI18n();
  const expenses = visibleExpenses(store.expenses);
  const monthTotal = expenses.filter((expense) => new Date(expense.spentAt) >= startOfMonth()).reduce((sum, expense) => sum + expense.amount, 0);
  const weekTotal = expenses.filter((expense) => new Date(expense.spentAt) >= startOfWeek()).reduce((sum, expense) => sum + expense.amount, 0);
  const recent = expenses.slice(0, 5);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <WalletCard total={monthTotal} currency={store.profile?.currency ?? "USD"} weekTotal={weekTotal} />
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-transparent py-1 sm:gap-4 xl:col-span-2 xl:grid-cols-4">
        <QuickAction icon={Plus} label={t("home.add")} onClick={onAddExpense} accent />
        <QuickAction icon={Clock3} label={t("home.activity")} href="/history" />
        <QuickAction icon={ChartNoAxesColumnIncreasing} label={t("nav.insights")} href="/insights" />
        <QuickAction icon={SlidersHorizontal} label={t("home.manage")} href="/manage" />
      </div>
      <SavingsGoalsPreview />
      <section className="xl:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">{t("home.recent")}</h2>
          <Link href="/history" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent">{t("home.viewAll")} <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <ExpenseList expenses={recent} onEdit={onEditExpense} />
      </section>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, onClick, accent = false }: { icon: typeof Plus; label: string; href?: string; onClick?: () => void; accent?: boolean }) {
  const className = "action-link group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl transition hover:bg-raised active:scale-[0.98]";
  const content = <><span className={cx("grid h-11 w-11 place-items-center rounded-full transition group-hover:scale-105", accent ? "bg-accent text-white" : "bg-raised text-text")}><Icon className="h-5 w-5" strokeWidth={1.9} /></span><span className="text-[13px] font-semibold">{label}</span></>;
  return onClick ? <button type="button" onClick={() => onClick()} className={className}>{content}</button> : <Link href={href ?? "#"} className={className}>{content}</Link>;
}

function WalletCard({ total, currency, weekTotal }: { total: number; currency: string; weekTotal: number }) {
  const { t, language } = useI18n();
  const [visible, setVisible] = useState(true);
  return <section className="relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-xl bg-[linear-gradient(135deg,#d5d9ff_0%,#a7b3f6_48%,#6a74e5_100%)] p-6 text-white shadow-soft dark:bg-[linear-gradient(135deg,#25294d_0%,#4c558b_48%,#9ea3ff_100%)]">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><WalletCards className="h-5 w-5" /> Walletly</div><button aria-label={visible ? t("home.hideTotal") : t("home.showTotal")} className="grid h-11 w-11 place-items-center rounded-full text-white/90 transition hover:bg-white/15" onClick={() => setVisible((current) => !current)}>{visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div>
    <div><p className="text-[13px] text-white/75">{t("home.totalMonth")} · {currency}</p><p className="mt-1 text-4xl font-bold tabular-nums">{visible ? formatMoney(total, currency, languageLocale(language)) : "••••"}</p></div>
    <div className="flex items-center justify-between text-[13px] text-white/75"><span>{t("home.thisWeek")}</span><span className="font-semibold text-white">{visible ? formatMoney(weekTotal, currency, languageLocale(language)) : "••••"}</span></div>
  </section>;
}

function ExpenseSheet({ editId, onClose }: { editId?: string; onClose: () => void }) {
  const { t } = useI18n();
  const params = useSearchParams();
  const resolvedEditId = editId ?? params.get("edit") ?? undefined;
  const editing = Boolean(resolvedEditId);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); }, []);

  function dismiss() {
    if (closing) return;
    setClosing(true);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
    closeTimer.current = window.setTimeout(onClose, duration);
  }

  return (
    <div className={cx("expense-sheet-backdrop fixed inset-0 z-50 flex", closing && "is-closing")} role="presentation" onClick={dismiss}>
      <section className="expense-sheet relative" role="dialog" aria-modal="true" aria-labelledby="expense-sheet-title" onClick={(event) => event.stopPropagation()}>
        <span className="sheet-handle" aria-hidden="true" />
        <header className="expense-sheet-header flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{editing ? t("expense.updateRecord") : t("expense.quickCapture")}</p>
            <h2 id="expense-sheet-title" className="mt-1 text-2xl font-bold">{editing ? t("expense.editTitle") : t("expense.addTitle")}</h2>
          </div>
          <button type="button" className="icon-button" aria-label={t("expense.close")} onClick={dismiss}><X className="h-5 w-5" /></button>
        </header>
        <ExpenseForm compact editId={resolvedEditId} onSaved={dismiss} />
      </section>
    </div>
  );
}

function ExpenseForm({ compact = false, editId: explicitEditId, onSaved }: { compact?: boolean; editId?: string; onSaved?: () => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const params = useSearchParams();
  const editId = explicitEditId ?? params.get("edit") ?? undefined;
  const editing = store.expenses.find((expense) => expense.id === editId);
  const firstCategory = store.categories.find((item) => !item.archivedAt);
  const firstPayment = store.paymentMethods[0];
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? firstCategory?.id ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(editing?.paymentMethodId ?? firstPayment?.id ?? "");
  const [spentAt, setSpentAt] = useState(() => (editing?.spentAt ?? new Date().toISOString()).slice(0, 10));
  const [note, setNote] = useState(editing?.note ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(editing?.tagIds ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentMethodId && store.paymentMethods[0]) setPaymentMethodId(store.paymentMethods[0].id);
    if (!categoryId && firstCategory) setCategoryId(firstCategory.id);
  }, [categoryId, firstCategory, paymentMethodId, store.paymentMethods]);

  function save() {
    const parsed = parseAmountValue(amount);
    if (parsed === null) {
      setError(t("expense.amountError"));
      return;
    }
    if (!categoryId || !paymentMethodId) {
      setError(t("expense.selectionError"));
      return;
    }
    setError("");
    store.saveExpense({ amount: parsed, categoryId, paymentMethodId, spentAt: new Date(spentAt).toISOString(), note, tagIds: selectedTagIds }, editId);
    if (!editId) {
      setAmount("");
      setNote("");
      setSelectedTagIds([]);
    }
    onSaved?.();
  }

  function toggleTag(id: string) {
    setSelectedTagIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function addTag() {
    const name = tagDraft.trim();
    if (!name) return;
    const [id] = store.ensureTags([name]);
    if (id) setSelectedTagIds((current) => current.includes(id) ? current : [...current, id]);
    setTagDraft("");
    setAddingTag(false);
  }

  return (
    <div className={cx("add-expense-panel grid", !compact && "panel")}>
      {!compact && <h2 className="section-title">{editing ? t("expense.editTitle") : t("expense.addTitle")}</h2>}
      <div className="grid gap-2">
        <label className="label" htmlFor="expense-amount">{t("expense.amount")}</label>
        <CurrencyAmountInput locale={languageLocale(language)} id="expense-amount" className="amount-input" value={amount} onValueChange={(value) => { setAmount(value); setError(""); }} />
      </div>
      <div className="grid gap-2">
        <p className="label">{t("expense.category")}</p>
        <div className="category-rail flex gap-2 overflow-x-auto pb-1">
          {store.categories.filter((item) => !item.archivedAt).map((item) => {
            const selected = categoryId === item.id;
            return <button type="button" key={item.id} aria-pressed={selected} className={cx("category-card flex flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition", selected ? "bg-accent-soft text-accent-strong" : "bg-raised text-text")} onClick={() => setCategoryId(item.id)}><span className={cx("category-icon-well grid place-items-center rounded-full", selected ? "bg-accent-soft" : "bg-transparent")}><CategoryIcon name={item.name} icon={item.icon} color={selected ? "currentColor" : item.color} size={18} /></span><span className="category-label max-w-full text-[11px] font-semibold">{item.name}</span></button>;
          })}
          <Link href="/manage" className="add-category-card category-card flex flex-col items-center justify-center gap-1 rounded-2xl bg-raised px-2 text-center text-accent"><span className="category-icon-well grid place-items-center rounded-full bg-accent-soft"><Plus className="h-5 w-5" /></span><span className="text-[11px] font-semibold">{t("expense.addCategory")}</span></Link>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="label">{t("expense.paymentMethod")}</p>
        <div className="flex flex-wrap gap-2">
          {store.paymentMethods.map((item) => <button type="button" key={item.id} aria-pressed={paymentMethodId === item.id} className={cx("chip", paymentMethodId === item.id && "chip-active")} onClick={() => setPaymentMethodId(item.id)}>{item.name}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DatePicker value={spentAt} onChange={setSpentAt} />
        <div className="grid gap-2">
          <p className="label">{t("expense.tags")}</p>
          <div className="tag-rail flex gap-2 overflow-x-auto pb-1">
            {store.tags.map((tag) => <button type="button" key={tag.id} aria-pressed={selectedTagIds.includes(tag.id)} className={cx("tag-card flex flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition", selectedTagIds.includes(tag.id) ? "bg-accent-soft text-accent-strong" : "bg-raised text-text")} onClick={() => toggleTag(tag.id)}><span className="grid h-6 w-6 place-items-center rounded-full"><Tags className="h-4 w-4" /></span><span className="max-w-full truncate text-[11px] font-semibold">{tag.name}</span></button>)}
            <button type="button" className="add-tag-card tag-card flex flex-col items-center justify-center gap-1 rounded-2xl bg-raised px-2 text-center text-accent transition hover:bg-accent-soft" onClick={() => setAddingTag((current) => !current)}><span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft"><Plus className="h-4 w-4" /></span><span className="text-[11px] font-semibold">{t("expense.addTag")}</span></button>
          </div>
          {addingTag && <div className="tag-creator flex gap-2"><input autoFocus className="input min-h-11" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTag(); }} placeholder={t("expense.newTag")} /><button type="button" className="control min-h-11 bg-text px-4 text-bg" onClick={addTag}>{t("common.add")}</button></div>}
        </div>
      </div>
      <label className="label" htmlFor="expense-note">{t("expense.noteOptional")}<input id="expense-note" className="input mt-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("expense.notePlaceholder")} /></label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="control justify-center bg-text text-bg" onClick={save}><Check className="h-5 w-5" />{editing ? t("expense.saveChanges") : t("expense.save")}</button>
    </div>
  );
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
}

function formatDateLabel(value: string) {
  const date = dateFromInput(value);
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()].map((part, index) => index < 2 ? String(part).padStart(2, "0") : String(part)).join("/");
}

function DatePicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => { const date = dateFromInput(value); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const firstDay = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
  const selected = dateFromInput(value);

  return (
    <div className="relative">
      <p className="label">{label ?? t("expense.date")}</p>
      <button type="button" className="input mt-2 flex w-full items-center justify-between text-left" aria-label={t("expense.chooseDate")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{formatDateLabel(value)}</span>
        <CalendarDays className="h-5 w-5 text-text" />
      </button>
      {open && <div className="calendar-popover absolute inset-x-0 top-[calc(100%+8px)] z-40 rounded-2xl bg-surface p-3 shadow-soft" role="dialog" aria-label={t("expense.chooseDate")}>
        <div className="flex items-center justify-between">
          <button type="button" className="icon-button h-9 w-9" aria-label={t("expense.previousMonth")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <p className="text-sm font-semibold">{month.toLocaleDateString(languageLocale(language), { month: "long", year: "numeric" })}</p>
          <button type="button" className="icon-button h-9 w-9" aria-label={t("expense.nextMonth")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-muted">{Array.from({ length: 7 }, (_, index) => <span key={index} className="py-1">{new Intl.DateTimeFormat(languageLocale(language), { weekday: "narrow" }).format(new Date(2024, 0, 1 + index))}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) => date ? <button type="button" key={date.toISOString()} className={cx("grid aspect-square place-items-center rounded-full text-sm transition hover:bg-raised", dateInputValue(date) === dateInputValue(selected) && "bg-accent text-white")} onClick={() => { onChange(dateInputValue(date)); setOpen(false); }}>{date.getDate()}</button> : <span key={`empty-${index}`} />)}
        </div>
      </div>}
    </div>
  );
}

function HistoryView({ onEditExpense }: { onEditExpense: (id: string) => void }) {
  const store = useAppStore();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<"all" | "week" | "month">("month");
  const [category, setCategory] = useState("all");
  const filtered = visibleExpenses(store.expenses).filter((expense) => {
    const expenseCategory = store.categories.find((item) => item.id === expense.categoryId);
    const haystack = `${expense.note} ${expenseCategory?.name ?? ""}`.toLowerCase();
    const afterRange = range === "week" ? new Date(expense.spentAt) >= startOfWeek() : range === "month" ? new Date(expense.spentAt) >= startOfMonth() : true;
    return haystack.includes(query.toLowerCase()) && afterRange && (category === "all" || expense.categoryId === category);
  });
  return (
    <section>
      <div className="grid gap-4 pb-5">
        <div><p className="eyebrow">{t("history.context")}</p><h2 className="mt-1 text-2xl font-bold">{t("history.title")}</h2></div>
        <label className="relative block"><Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-muted" /><input className="input pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("history.search")} /></label>
        <div className="flex flex-wrap gap-2">
          {(["week", "month", "all"] as const).map((item) => <button key={item} className={cx("chip", range === item && "chip-active")} onClick={() => setRange(item)}>{item === "all" ? t("history.allTime") : item === "week" ? t("history.thisWeek") : t("history.thisMonth")}</button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={cx("chip shrink-0", category === "all" && "chip-active")} onClick={() => setCategory("all")}>{t("history.allCategories")}</button>
          {store.categories.filter((item) => !item.archivedAt).map((item) => <button key={item.id} className={cx("chip shrink-0", category === item.id && "chip-active")} onClick={() => setCategory(item.id)}>{item.name}</button>)}
        </div>
        <p className="text-[13px] text-muted">{t("history.resultCount").replace("{count}", String(filtered.length)).replace("{label}", filtered.length === 1 ? t("history.expense") : t("history.expenses"))}</p>
      </div>
      <ExpenseList expenses={filtered} onEdit={onEditExpense} />
    </section>
  );
}

function ExpenseList({ expenses, onEdit }: { expenses: Expense[]; onEdit?: (id: string) => void }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  if (!expenses.length) return <div className="rounded-2xl bg-raised p-6 text-center text-muted">{t("history.noExpenses")}</div>;
  return (
    <div>
      {expenses.map((expense) => {
        const category = store.categories.find((item) => item.id === expense.categoryId);
        return (
          <div key={expense.id} className="expense-row grid min-h-[68px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-b border-line px-2 py-2 transition hover:bg-raised active:scale-[0.995]">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><CategoryIcon icon={category?.icon} /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{category?.name ?? "Expense"}</p>
              <p className="truncate text-[13px] text-muted">{expense.note || formatExpenseDate(expense.spentAt, languageLocale(language))}</p>
            </div>
            <div className="flex items-center gap-2">
              {onEdit ? <button type="button" onClick={() => onEdit(expense.id)} className="hidden min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-text sm:flex">{t("common.edit")}</button> : <Link href={`/add-expense?edit=${expense.id}`} className="hidden min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-text sm:flex">{t("common.edit")}</Link>}
              <button className="icon-button" aria-label={t("history.deleteExpense")} onClick={() => store.deleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></button>
              <p className="w-20 text-right text-sm font-semibold tabular-nums sm:w-24">{formatMoney(expense.amount, expense.currency, languageLocale(language))}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightsView() {
  const store = useAppStore();
  const { t, language } = useI18n();
  const expenses = visibleExpenses(store.expenses);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const params = useSearchParams();
  const [mode, setMode] = useState<"expenses" | "income" | "goals">(() => params.get("tab") === "goals" ? "goals" : "expenses");
  useEffect(() => { if (params.get("tab") === "goals") setMode("goals"); }, [params]);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeNote, setIncomeNote] = useState("");
  const [incomeDate, setIncomeDate] = useState(() => dateInputValue(new Date()));
  const [budgetAmount, setBudgetAmount] = useState("");
  const [incomeAmountError, setIncomeAmountError] = useState(false);
  const [budgetAmountError, setBudgetAmountError] = useState(false);
  const [insightMonth, setInsightMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const currency = store.profile?.currency ?? "USD";
  const currentMonth = monthKey(insightMonth);
  const currentBudgetStatus = budgetStatus(store.budgets, store.expenses, currency, currentMonth);
  const periodExpenses = expenses.filter((expense) => period === "week" ? new Date(expense.spentAt) >= startOfWeek() : new Date(expense.spentAt) >= startOfMonth());
  const total = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const bars = period === "week"
    ? Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      const mondayOffset = (date.getDay() + 6) % 7;
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - mondayOffset + index);
      return { label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date).slice(0, 2), amount: periodExpenses.filter((expense) => new Date(expense.spentAt).toDateString() === date.toDateString()).reduce((sum, expense) => sum + expense.amount, 0) };
    })
    : Array.from({ length: 5 }, (_, index) => ({ label: `W${index + 1}`, amount: periodExpenses.filter((expense) => Math.floor((new Date(expense.spentAt).getDate() - 1) / 7) === index).reduce((sum, expense) => sum + expense.amount, 0) }));
  const max = Math.max(1, ...bars.map((bar) => bar.amount));
  const totals = store.categories.map((category, index) => ({
    category,
    total: periodExpenses.filter((expense) => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amount, 0),
    color: ["#6366F1", "#2E9BC3", "#D59C48", "#B26DD4", "#D95D70"][index % 5],
  })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow">{t("insights.context")}</p><h2 className="mt-1 text-2xl font-bold">{t("nav.insights")}</h2></div><ChartNoAxesColumnIncreasing className="h-6 w-6 text-accent" /></div>
      <div className="segmented-control grid-cols-3">
        <ActivePill index={mode === "expenses" ? 0 : mode === "income" ? 1 : 2} count={3} variant="segment" />
        {(["expenses", "income", "goals"] as const).map((item) => <button key={item} aria-pressed={mode === item} className={cx("control min-h-11 justify-center rounded-full bg-transparent px-2 text-sm", mode === item && "text-text")} onClick={() => setMode(item)}>{item === "expenses" ? t("insights.expenses") : item === "income" ? t("insights.income") : t("goals.title")}</button>)}
      </div>
      {mode === "goals" ? <SavingsGoalsView /> : mode === "income" ? <section className="grid gap-5">
        <div className="flex items-center justify-between rounded-xl bg-raised px-3 py-2"><button type="button" className="icon-button" aria-label={t("expense.previousMonth")} onClick={() => setInsightMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-5 w-5" /></button><p className="text-sm font-semibold">{insightMonth.toLocaleDateString(languageLocale(language), { month: "long", year: "numeric" })}</p><button type="button" className="icon-button" aria-label={t("expense.nextMonth")} onClick={() => setInsightMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-5 w-5" /></button></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-raised p-4"><p className="text-[13px] text-muted">{t("insights.incomeTotal")}</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(sumAmounts(activeIncome(store.incomeEntries, currency, currentMonth)), currency, languageLocale(language))}</p></div>
          <div className="rounded-xl bg-raised p-4"><p className="text-[13px] text-muted">{t("insights.expenses")}</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(sumAmounts(activeExpenses(store.expenses, currency, currentMonth)), currency, languageLocale(language))}</p></div>
          <div className="rounded-xl bg-raised p-4"><p className="text-[13px] text-muted">{t("insights.remaining")}</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(sumAmounts(activeIncome(store.incomeEntries, currency, currentMonth)) - sumAmounts(activeExpenses(store.expenses, currency, currentMonth)), currency, languageLocale(language))}</p></div>
        </div>
        <div className="grid gap-4 rounded-xl bg-raised p-4 sm:grid-cols-2">
          <form noValidate className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const amount = parseAmountValue(incomeAmount); if (amount === null) { setIncomeAmountError(true); return; } setIncomeAmountError(false); const receivedAt = dateFromInput(incomeDate); receivedAt.setHours(12, 0, 0, 0); store.saveIncome({ amount, currency, receivedAt: receivedAt.toISOString(), note: incomeNote.trim() }); setInsightMonth(new Date(receivedAt.getFullYear(), receivedAt.getMonth(), 1)); setIncomeAmount(""); setIncomeNote(""); }}>
            <div><p className="font-semibold">{t("insights.addIncome")}</p><p className="mt-1 text-[13px] text-muted">{t("insights.monthlyOverview")}</p></div>
            <CurrencyAmountInput locale={languageLocale(language)} className="input" required value={incomeAmount} onValueChange={(value) => { setIncomeAmount(value); setIncomeAmountError(false); }} placeholder={t("insights.incomePlaceholder")} aria-label={t("insights.addIncome")} aria-invalid={incomeAmountError} />
            {incomeAmountError && <p role="alert" className="text-sm text-danger">{t("expense.amountError")}</p>}
            <DatePicker value={incomeDate} onChange={setIncomeDate} label={t("insights.receivedDate")} />
            <input className="input" value={incomeNote} onChange={(event) => setIncomeNote(event.target.value)} placeholder={t("expense.notePlaceholder")} aria-label={t("expense.noteOptional")} />
            <button className="control justify-center bg-text text-bg" type="submit">{t("common.add")}</button>
          </form>
          <form noValidate className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const amount = parseAmountValue(budgetAmount); if (amount === null) { setBudgetAmountError(true); return; } setBudgetAmountError(false); store.saveBudget({ amount, currency, month: currentMonth }); setBudgetAmount(""); }}>
            <div><p className="font-semibold">{t("insights.addBudget")}</p><p className="mt-1 text-[13px] text-muted">{t("insights.budget")}: {currentMonth}</p></div>
            <CurrencyAmountInput locale={languageLocale(language)} className="input" required value={budgetAmount} onValueChange={(value) => { setBudgetAmount(value); setBudgetAmountError(false); }} placeholder={t("insights.budgetPlaceholder")} aria-label={t("insights.addBudget")} aria-invalid={budgetAmountError} />
            {budgetAmountError && <p role="alert" className="text-sm text-danger">{t("expense.amountError")}</p>}
            <div className="flex min-h-11 items-center text-sm text-muted">{currentBudgetStatus ? `${formatMoney(currentBudgetStatus.spent, currency, languageLocale(language))} ${t("insights.spentOf")} ${formatMoney(currentBudgetStatus.budget.amount, currency, languageLocale(language))}` : t("insights.noBudget")}</div>
            <button className="control justify-center bg-accent text-white" type="submit">{t("common.saveChanges")}</button>
          </form>
        </div>
        {currentBudgetStatus && <div className="grid gap-2 rounded-xl bg-raised p-4"><div className="flex min-h-12 items-center justify-between gap-3"><div><p className="text-sm font-semibold">{t("insights.budget")} · {currentBudgetStatus.budget.month}</p><p className="text-[11px] text-muted">{currentBudgetStatus.remaining >= 0 ? `${t("insights.remaining")}: ${formatMoney(currentBudgetStatus.remaining, currency, languageLocale(language))}` : t("insights.overBudget").replace("{amount}", formatMoney(Math.abs(currentBudgetStatus.remaining), currency, languageLocale(language)))}</p></div><button className="icon-button" aria-label={t("insights.removeBudget")} onClick={() => store.deleteBudget(currentBudgetStatus.budget.id)}><Trash2 className="h-4 w-4" /></button></div><div className="h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={t("insights.budget")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(currentBudgetStatus.percentage))}><div className={cx("h-full rounded-full transition-[width] duration-500", currentBudgetStatus.remaining < 0 ? "bg-danger" : "bg-accent")} style={{ width: `${Math.min(100, Math.max(0, currentBudgetStatus.percentage))}%` }} /></div></div>}
        <div className="grid gap-2">
          {activeIncome(store.incomeEntries, currency, currentMonth).map((entry) => <div key={entry.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.note || t("insights.income")}</p><p className="text-[11px] text-muted">{formatExpenseDate(entry.receivedAt, languageLocale(language))}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold tabular-nums">{formatMoney(entry.amount, currency, languageLocale(language))}</span><button className="icon-button" aria-label={t("insights.removeIncome")} onClick={() => store.deleteIncome(entry.id)}><Trash2 className="h-4 w-4" /></button></div></div>)}
          {activeIncome(store.incomeEntries, currency, currentMonth).length === 0 && <p className="text-[13px] text-muted">{t("insights.noIncome")}</p>}
        </div>
      </section> : <>
        <section className="grid gap-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[13px] text-muted">{period === "week" ? t("history.thisWeek") : t("history.thisMonth")} · {currency}</p><p className="mt-1 text-4xl font-bold tabular-nums">{formatMoney(total, currency, languageLocale(language))}</p></div><div className="flex gap-1">{(["week", "month"] as const).map((item) => <button key={item} className={cx("chip", period === item && "chip-active")} onClick={() => setPeriod(item)}>{item === "week" ? t("insights.week") : t("insights.month")}</button>)}</div></div>
          <div className="flex min-h-[190px] items-end gap-2 sm:gap-4">
            {bars.map((bar) => <div key={bar.label} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-36 w-full items-end overflow-hidden rounded-full bg-raised"><div className="w-full rounded-full bg-accent" style={{ height: `${Math.max(bar.amount ? 8 : 2, Math.min(100, (bar.amount / max) * 100))}%` }} /></div><span className="text-[11px] font-semibold text-muted">{bar.label}</span></div>)}
          </div>
        </section>
        <section className="grid gap-4"><div className="flex items-center justify-between"><h3 className="section-title">{t("insights.whereItWent")}</h3><span className="text-[13px] text-muted">{totals.length} {totals.length === 1 ? t("insights.category") : t("insights.categories")}</span></div>{totals.length ? <div className="grid gap-3">{totals.slice(0, 6).map(({ category, total: amount, color }) => { const share = total > 0 ? Math.round((amount / total) * 100) : 0; return <div key={category.id} className="flex min-h-12 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft" style={{ color }}><CategoryIcon icon={category.icon} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{category.name}</p><p className="text-[11px] text-muted">{t("insights.shareOfTotal").replace("{share}", String(share))}</p></div><p className="text-sm font-semibold tabular-nums">{formatMoney(amount, currency, languageLocale(language))}</p></div>; })}</div> : <p className="text-[13px] text-muted">{t("insights.empty")}</p>}</section>
      </>}
    </section>
  );
}

function ManageView() {
  const store = useAppStore();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconName>("more-horizontal");
  const [payment, setPayment] = useState("");
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel">
        <h2 className="section-title">{t("manage.categories")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("manage.newCategory")} />
          <button className="control justify-center bg-accent text-white" onClick={() => { store.addCategory(name, icon); setName(""); }}>{t("common.add")}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{categoryIconNames.map((item) => <button key={item} className={cx("icon-button", icon === item && "bg-text text-bg")} onClick={() => setIcon(item)}><CategoryIcon name={item} /></button>)}</div>
        <div className="mt-5 grid gap-2">{store.categories.filter((item) => !item.archivedAt).map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between rounded-2xl bg-raised px-3"><span className="flex items-center gap-2"><CategoryIcon name={item.icon} />{item.name}</span>{item.kind === "custom" && <button className="icon-button" onClick={() => store.archiveCategory(item.id)}><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
      </section>
      <section className="panel">
        <h2 className="section-title">{t("manage.paymentAndTags")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder={t("manage.newPayment")} />
          <button className="control justify-center bg-accent text-white" onClick={() => { store.ensurePaymentMethods([payment]); setPayment(""); }}>{t("common.add")}</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{store.paymentMethods.map((item) => <span key={item.id} className="chip">{item.name}</span>)}</div>
        <h3 className="mt-8 font-semibold">{t("manage.reusableTags")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">{store.tags.length ? store.tags.map((tag) => <span key={tag.id} className="chip"><Tags className="h-4 w-4" />{tag.name}</span>) : <p className="text-sm text-muted">{t("manage.tagsEmpty")}</p>}</div>
      </section>
    </div>
  );
}

function ProfileView() {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [name, setName] = useState(store.user?.name ?? "");
  const active = visibleExpenses(store.expenses);
  const monthTotal = active.filter((expense) => new Date(expense.spentAt) >= startOfMonth()).reduce((sum, expense) => sum + expense.amount, 0);
  const loggedDays = new Set(active.map((expense) => new Date(expense.spentAt).toDateString())).size;
  const providerLabel = store.user?.isDemo ? t("profile.demoWorkspace") : store.user?.provider === "google" ? t("profile.googleAccount") : t("profile.emailAccount");
  return (
    <section className="grid max-w-2xl gap-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow">{t("profile.account")}</p><h2 className="mt-1 text-2xl font-bold">{t("nav.profile")}</h2></div><Link href="/settings" aria-label={t("nav.settings")} className="icon-button"><Settings className="h-5 w-5" /></Link></div>
      <div className="flex items-center gap-4"><div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-accent-soft text-xl font-bold text-accent">{store.user?.name?.slice(0, 2).toUpperCase() || "W"}</div><div className="min-w-0"><p className="truncate text-[17px] font-semibold">{store.user?.name ?? store.user?.email ?? t("profile.yourWallet")}</p><p className="truncate text-[13px] text-muted">{store.user?.email ?? t("profile.localDemoAccount")}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-success"><ShieldCheck className="h-3.5 w-3.5" />{providerLabel}</p></div></div>
      <div className="grid grid-cols-3 gap-3 py-2"><ProfileStat value={String(active.length)} label={t("profile.expenses")} /><ProfileStat value={formatMoney(monthTotal, store.profile?.currency ?? "USD", languageLocale(language))} label={`${t("profile.thisMonth")} · ${store.profile?.currency ?? "USD"}`} compact /><ProfileStat value={String(loggedDays)} label={t("profile.loggedDays")} /></div>
      <section className="grid gap-4"><h3 className="section-title">{t("profile.basicInfo")}</h3><label className="label" htmlFor="profile-name">{t("profile.name")}<input id="profile-name" className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("profile.namePlaceholder")} /></label><button className="control justify-center bg-surface text-text shadow-sm" onClick={() => void store.updateDisplayName(name)}><Pencil className="h-4 w-4" />{t("common.saveChanges")}</button></section>
      <section className="grid gap-2"><h3 className="section-title mb-2">{t("profile.yourWallet")}</h3><ProfileInfo icon={CalendarDays} label={t("profile.memberSince")} detail={store.user?.createdAt ? new Intl.DateTimeFormat(languageLocale(language), { month: "short", year: "numeric" }).format(new Date(store.user.createdAt)) : t("profile.thisDevice")} /><ProfileInfo icon={Cloud} label={t("profile.syncStatus")} detail={!store.cloudEnabled ? t("profile.storedOnDevice") : !store.isOnline ? t("profile.offlineSafe") : t("profile.cloudSyncOn")} /><Link href="/settings" className="flex min-h-16 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><Settings className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("profile.preferences")}</span><span className="block text-[13px] text-muted">{t("profile.preferencesDetail")}</span></span><ChevronRight className="h-4 w-4 text-muted" /></Link></section>
      <p className="pt-2 text-center text-[11px] font-semibold text-muted">WALLETLY / A QUIETER WAY TO TRACK MONEY</p>
    </section>
  );
}

function ProfileStat({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return <div className="grid min-h-16 min-w-0 place-items-center gap-1 text-center"><p className={cx("max-w-full truncate font-bold tabular-nums", compact ? "text-sm" : "text-xl")}>{value}</p><p className="max-w-full truncate text-[11px] font-semibold text-muted">{label}</p></div>;
}

function ProfileInfo({ icon: Icon, label, detail }: { icon: typeof CalendarDays; label: string; detail: string }) {
  return <div className="flex min-h-16 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block truncate text-[13px] text-muted">{detail}</span></span></div>;
}

function SettingsView() {
  const store = useAppStore();
  const { language, setLanguage, t } = useI18n();
  const { mode, setMode } = useLedgerTheme();
  const [reminders, setReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const exportEvents = useRef<number[]>([]);
  useEffect(() => { void notificationsEnabled(store.user?.isDemo ? undefined : store.user?.id).then(setReminders); }, [store.user?.id, store.user?.isDemo]);

  function exportData(type: "json" | "csv") {
    const decision = consumeRollingWindow(exportEvents.current, Date.now(), 5, 60_000);
    exportEvents.current = decision.events;
    if (!decision.allowed) {
      setExportMessage(t("settings.exportRateLimited").replace("{time}", formatShortCountdown(decision.retryAfterSeconds)));
      return;
    }
    setExportMessage(null);
    const content = exportWalletlyData(store, type);
    const blob = new Blob([content], { type: type === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `walletly-export.${type}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await store.deleteAccount();
      setDeleteConfirmOpen(false);
    } catch {
      setDeleteError(t("settings.deleteFailed"));
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel">
        <h2 className="section-title">{t("settings.title")}</h2>
        <div className="mt-5 grid gap-3">
          <Segment label={t("settings.appearanceLabel")} options={["system", "light", "dark"]} labels={[t("settings.system"), t("settings.light"), t("settings.dark")]} value={mode} onChange={(value) => setMode(value as typeof mode)} icons={[Settings, Sun, Moon]} />
          <Segment label={t("settings.language")} options={["en", "ru", "uz"]} labels={[t("settings.languageEnglish"), t("settings.languageRussian"), t("settings.languageUzbek")]} value={language} onChange={(value) => setLanguage(value as typeof language)} />
          <button className="control justify-between bg-raised" onClick={async () => { setReminderMessage(null); try { if (reminders) { await setDailyReminderEnabled(false, store.user?.isDemo ? undefined : store.user?.id); setReminders(false); return; } const enabled = await setDailyReminderEnabled(true, store.user?.isDemo ? undefined : store.user?.id); setReminders(enabled); if (!enabled) setReminderMessage(t("settings.reminderUnavailable")); } catch { setReminderMessage(t("settings.reminderUnavailable")); } }}>
            <span className="flex items-center gap-2"><Bell className="h-5 w-5" /> {t("settings.dailyCheckIn")}</span><span>{reminders ? t("settings.on") : t("settings.off")}</span>
          </button>
          <p className="text-xs leading-5 text-muted">{t("settings.reminderHelp")}</p>
          {reminderMessage && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{reminderMessage}</p>}
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">{t("settings.dataAccount")}</h2>
        <div className="mt-5 grid gap-3">
          <button className="control justify-between bg-raised" onClick={() => exportData("json")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> {t("settings.exportJsonShort")}</span><ChevronRight className="h-5 w-5" /></button>
          <button className="control justify-between bg-raised" onClick={() => exportData("csv")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> {t("settings.exportCsvShort")}</span><ChevronRight className="h-5 w-5" /></button>
          <Link href="/privacy" className="control justify-between bg-raised"><span className="flex items-center gap-2"><Shield className="h-5 w-5" /> {t("settings.privacyPolicy")}</span><ChevronRight className="h-5 w-5" /></Link>
          <Link href="/terms" className="control justify-between bg-raised">{t("settings.termsService")}<ChevronRight className="h-5 w-5" /></Link>
          <Link href="/cookies" className="control justify-between bg-raised">{t("settings.cookiePolicy")}<ChevronRight className="h-5 w-5" /></Link>
          <button className="control justify-between bg-raised" onClick={() => void store.signOut()}><span className="flex items-center gap-2"><LogOut className="h-5 w-5" /> {t("settings.signOut")}</span></button>
          <button className="control justify-between bg-danger/10 text-danger" onClick={() => { setDeleteError(null); setDeleteConfirmOpen(true); }}><span className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> {t("settings.deleteAccount")}</span></button>
          {exportMessage && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">{exportMessage}</p>}
        </div>
      </section>
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center" role="presentation" onClick={() => { if (!deleting) setDeleteConfirmOpen(false); }}>
          <section className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-soft sm:p-6" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="delete-account-title" className="text-lg font-bold">{t("settings.deleteDialogTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{t("settings.deleteDialogDetail")}</p>
                {deleteError && <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger" role="alert">{deleteError}</p>}
              </div>
              <button className="icon-button shrink-0" type="button" aria-label={t("common.close")} disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className="control justify-center bg-raised" type="button" disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>{t("common.cancel")}</button>
              <button className="control justify-center bg-danger text-white disabled:opacity-60" type="button" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? t("settings.deleting") : t("settings.confirmDeleteAction")}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Segment({ label, options, labels = options, value, onChange, icons }: { label: string; options: string[]; labels?: string[]; value: string; onChange: (value: string) => void; icons?: Array<typeof Settings> }) {
  const activeIndex = Math.max(0, options.indexOf(value));
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <div className="segmented-control grid-cols-3">
        <ActivePill index={activeIndex} count={options.length} variant="segment" />
        {options.map((option, index) => {
          const Icon = icons?.[index];
          return <button key={option} className={cx("control min-h-11 justify-center rounded-xl bg-transparent", value === option && "text-text")} onClick={() => onChange(option)}>{Icon && <Icon className="h-4 w-4" />}{labels[index] ?? option}</button>;
        })}
      </div>
    </div>
  );
}

function ConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(localStorage.getItem(CONSENT_KEY) !== "true" || localStorage.getItem(COOKIE_CONSENT_KEY) !== "true"), []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-xl rounded-[24px] bg-text p-3 text-bg shadow-glass sm:p-4 lg:bottom-6">
      <p className="text-xs leading-5 sm:text-sm">{t("consent.message")}</p>
      <div className="mt-2 flex gap-2 sm:mt-3">
        <button className="control min-h-10 bg-bg px-4 py-1.5 text-text" onClick={() => { localStorage.setItem(CONSENT_KEY, "true"); localStorage.setItem(COOKIE_CONSENT_KEY, "true"); setVisible(false); }}>{t("common.accept")}</button>
        <Link href="/privacy" className="control min-h-10 bg-bg/10 px-4 py-1.5">{t("common.review")}</Link>
      </div>
    </div>
  );
}

function InstallPrompt() {
  const { t } = useI18n();
  const [event, setEvent] = useState<Event | null>(null);
  useEffect(() => {
    const listener = (installEvent: Event) => {
      installEvent.preventDefault();
      setEvent(installEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  if (!event) return null;
  return <button className="fixed right-4 top-4 z-40 hidden rounded-2xl bg-text px-4 py-3 text-sm font-semibold text-bg shadow-glass md:block" onClick={() => void (event as Event & { prompt?: () => Promise<void> }).prompt?.()}>{t("install.walletly")}</button>;
}
