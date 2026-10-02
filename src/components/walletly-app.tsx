"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronLeft, ChevronRight, Clock3, Cloud, Download, Eye, EyeOff, Home, LineChart, ListFilter, LogOut, Moon, Pencil, Plus, RefreshCw, Search, Settings, Shield, ShieldCheck, SlidersHorizontal, Sun, Tags, Trash2, User, WalletCards, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CategoryIcon, categoryIconNames } from "@/components/category-icon";
import { GoogleLogo } from "@/components/google-logo";
import { CONSENT_KEY, COOKIE_CONSENT_KEY, DEFAULT_PAYMENT_METHODS, WALLETLY_CURRENCIES } from "@/lib/constants";
import { formatExpenseDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n-provider";
import { notificationsEnabled, setDailyReminderEnabled } from "@/lib/notifications";
import { useAppStore } from "@/lib/app-store";
import type { CategoryIconName, Expense } from "@/lib/types";
import { useLedgerTheme } from "@/theme/theme-provider";

type View = "home" | "add" | "history" | "insights" | "manage" | "profile" | "settings";

const navItems = [
  { href: "/", view: "home", label: "Home", icon: Home },
  { href: "/history", view: "history", label: "History", icon: ListFilter },
  { href: "/insights", view: "insights", label: "Insights", icon: LineChart },
  { href: "/profile", view: "profile", label: "Profile", icon: User },
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
    return <div className="grid min-h-dvh place-items-center px-6 text-muted">Loading Walletly...</div>;
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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitGoogle() {
    setBusy(true);
    setMessage("");
    try {
      await store.signInSocial("google");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start Google sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail() {
    setBusy(true);
    setMessage("");
    try {
      await store.signInEmail(email);
      setMessage("Magic link sent. Open it on this device to continue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-8 text-text">
      <section className="w-full max-w-md rounded-[28px] bg-surface p-6 shadow-soft sm:p-8">
        <div className="mb-8">
          <img src="/branding/walletly-mascot.png" alt="Walletly" className="h-auto w-52 rounded-2xl bg-white p-2 shadow-sm" />
          <h1 className="sr-only">Walletly</h1>
          <p className="mt-3 text-sm text-muted">Private expense tracking for the web.</p>
        </div>
        <button className="control w-full justify-center bg-text text-bg" disabled={busy} onClick={() => void submitGoogle()}>
          <GoogleLogo /> Continue with Google
        </button>
        <div className="my-5 h-px bg-line" />
        <label className="label" htmlFor="email">Email magic link</label>
        <input id="email" className="input mt-2" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        <button className="control mt-3 w-full justify-center bg-accent text-white" disabled={busy || !email.includes("@")} onClick={() => void submitEmail()}>
          {busy ? "Sending..." : "Send magic link"}
        </button>
        <button className="control mt-3 w-full justify-center bg-raised text-text" onClick={() => void store.signInDemo()}>
          Try local demo
        </button>
        {message && <p className="mt-4 text-sm text-muted">{message}</p>}
        <p className="mt-6 text-xs leading-5 text-muted">By continuing, confirm you are old enough to consent to Walletly processing your data for expense tracking.</p>
      </section>
    </main>
  );
}

function OnboardingScreen() {
  const store = useAppStore();
  const [currency, setCurrency] = useState("USD");
  const [payment, setPayment] = useState<string>(DEFAULT_PAYMENT_METHODS[0]);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-8 text-text">
      <section className="w-full max-w-lg rounded-[28px] bg-surface p-6 shadow-soft">
        <p className="eyebrow">Set up Walletly</p>
        <h1 className="mt-2 text-3xl font-semibold">Make it yours in one minute.</h1>
        <div className="mt-6">
          <p className="label">Main currency</p>
          <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2">
            {WALLETLY_CURRENCIES.map((item) => (
              <button key={item} className={cx("chip min-w-20", currency === item && "chip-active")} onClick={() => setCurrency(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <p className="label">Default payment method</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEFAULT_PAYMENT_METHODS.map((item) => (
              <button key={item} className={cx("control justify-between bg-raised", payment === item && "ring-2 ring-accent")} onClick={() => setPayment(item)}>
                {item}{payment === item && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
        <button className="control mt-8 w-full justify-center bg-text text-bg" onClick={() => store.completeOnboarding(currency, payment)}>Enter Walletly</button>
      </section>
    </main>
  );
}

function DesktopNav({ active, onAddExpense }: { active: View; onAddExpense: () => void }) {
  return (
    <nav className="fixed left-6 top-6 z-20 hidden w-56 rounded-[24px] bg-surface/88 p-3 shadow-soft backdrop-blur-xl lg:block">
      <Link href="/" className="mb-6 flex items-center gap-3 px-2 py-2">
        <img src="/branding/walletly-mascot.png" alt="" className="h-10 w-10 rounded-xl bg-white object-cover p-0.5" />
        <span className="text-lg font-bold">Walletly</span>
      </Link>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={cx("mb-1 flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold text-muted transition hover:bg-raised hover:text-text", active === item.view && "bg-accent-soft text-accent-strong")}>
            <Icon className="h-5 w-5" /> {item.label}
          </Link>
        );
      })}
      <button type="button" onClick={() => onAddExpense()} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-text px-4 text-sm font-semibold text-bg shadow-soft transition hover:opacity-85">
        <Plus className="h-5 w-5" /> Add expense
      </button>
      <Link href="/settings" className={cx("mt-3 flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold text-muted transition hover:bg-raised hover:text-text", active === "settings" && "bg-accent-soft text-accent-strong")}>
        <Settings className="h-5 w-5" /> Settings
      </Link>
    </nav>
  );
}

function MobileNav({ active, onAddExpense }: { active: View; onAddExpense: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <div className="flex min-h-[70px] flex-1 items-center justify-between rounded-full border border-white/30 bg-surface/78 p-1.5 shadow-glass backdrop-blur-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} className={cx("grid h-14 min-w-[58px] flex-1 place-items-center rounded-full text-muted transition", active === item.view && "bg-surface text-text shadow-sm")}>
              <Icon className="h-5 w-5" strokeWidth={active === item.view ? 2.3 : 1.8} />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
        </div>
        <button type="button" aria-label="Add expense" onClick={() => onAddExpense()} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-text text-bg shadow-soft transition hover:opacity-85">
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </nav>
  );
}

function TopBar() {
  const store = useAppStore();
  const name = store.user?.name?.trim() || "there";
  const greeting = name === "there" ? name : name.split(/\s+/)[0];
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-sm font-bold text-accent">
          {store.user?.avatarUrl ? <img src={store.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : greeting === "there" ? <img src="/branding/walletly-mascot.png" alt="" className="h-full w-full object-cover" /> : greeting.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-muted">Welcome back,</p>
          <h1 className="truncate text-[17px] font-semibold">{greeting}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden min-h-8 items-center gap-1.5 rounded-full bg-raised px-3 text-[11px] font-bold text-muted sm:flex">
          <span className={cx("h-1.5 w-1.5 rounded-full", !store.isOnline ? "bg-warning" : store.syncQueue.length ? "bg-accent" : "bg-success")} />
          {!store.isOnline ? "OFFLINE" : store.syncQueue.length ? "SYNCING" : "SYNCED"}
        </span>
        <button aria-label="Refresh sync" className="icon-button" onClick={store.retrySync}>
          <RefreshCw className={cx("h-5 w-5", store.isSyncing && "animate-spin")} />
        </button>
        <button aria-label="Notifications" className="icon-button hidden sm:grid"><Bell className="h-5 w-5" /></button>
      </div>
    </header>
  );
}

function HomeView({ onAddExpense, onEditExpense }: { onAddExpense: () => void; onEditExpense: (id: string) => void }) {
  const store = useAppStore();
  const expenses = visibleExpenses(store.expenses);
  const monthTotal = expenses.filter((expense) => new Date(expense.spentAt) >= startOfMonth()).reduce((sum, expense) => sum + expense.amount, 0);
  const weekTotal = expenses.filter((expense) => new Date(expense.spentAt) >= startOfWeek()).reduce((sum, expense) => sum + expense.amount, 0);
  const recent = expenses.slice(0, 5);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <WalletCard total={monthTotal} currency={store.profile?.currency ?? "USD"} weekTotal={weekTotal} />
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-transparent py-1 sm:gap-4 xl:col-span-2 xl:grid-cols-4">
        <QuickAction icon={Plus} label="Add" onClick={onAddExpense} accent />
        <QuickAction icon={Clock3} label="Activity" href="/history" />
        <QuickAction icon={ChartNoAxesColumnIncreasing} label="Insights" href="/insights" />
        <QuickAction icon={SlidersHorizontal} label="Manage" href="/manage" />
      </div>
      <section className="xl:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Recent activity</h2>
          <Link href="/history" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent">View all <ChevronRight className="h-4 w-4" /></Link>
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
  const [visible, setVisible] = useState(true);
  return <section className="relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-xl bg-[linear-gradient(135deg,#d5d9ff_0%,#a7b3f6_48%,#6a74e5_100%)] p-6 text-white shadow-soft dark:bg-[linear-gradient(135deg,#25294d_0%,#4c558b_48%,#9ea3ff_100%)]">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><WalletCards className="h-5 w-5" /> Walletly</div><button aria-label={visible ? "Hide total" : "Show total"} className="grid h-11 w-11 place-items-center rounded-full text-white/90 transition hover:bg-white/15" onClick={() => setVisible((current) => !current)}>{visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div>
    <div><p className="text-[13px] text-white/75">Total spent this month · {currency}</p><p className="mt-1 text-4xl font-bold tabular-nums">{visible ? formatMoney(total, currency) : "••••"}</p></div>
    <div className="flex items-center justify-between text-[13px] text-white/75"><span>This week</span><span className="font-semibold text-white">{visible ? formatMoney(weekTotal, currency) : "••••"}</span></div>
  </section>;
}

function ExpenseSheet({ editId, onClose }: { editId?: string; onClose: () => void }) {
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
            <p className="eyebrow">{editing ? "Update a record" : "Quick capture"}</p>
            <h2 id="expense-sheet-title" className="mt-1 text-2xl font-bold">{editing ? "Edit expense" : "Add expense"}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close add expense" onClick={dismiss}><X className="h-5 w-5" /></button>
        </header>
        <ExpenseForm compact editId={resolvedEditId} onSaved={dismiss} />
      </section>
    </div>
  );
}

function ExpenseForm({ compact = false, editId: explicitEditId, onSaved }: { compact?: boolean; editId?: string; onSaved?: () => void }) {
  const store = useAppStore();
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
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!categoryId || !paymentMethodId) {
      setError("Choose a category and payment method.");
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
      {!compact && <h2 className="section-title">{editing ? "Edit expense" : "Add expense"}</h2>}
      <div className="grid gap-2">
        <label className="label" htmlFor="expense-amount">Amount</label>
        <input id="expense-amount" className="amount-input" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} placeholder="0.00" />
      </div>
      <div className="grid gap-2">
        <p className="label">Category</p>
        <div className="category-rail flex gap-2 overflow-x-auto pb-1">
          {store.categories.filter((item) => !item.archivedAt).map((item) => {
            const selected = categoryId === item.id;
            return <button type="button" key={item.id} aria-pressed={selected} className={cx("category-card flex flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition", selected ? "bg-accent-soft text-accent-strong" : "bg-raised text-text")} onClick={() => setCategoryId(item.id)}><span className={cx("category-icon-well grid place-items-center rounded-full", selected ? "bg-accent-soft" : "bg-transparent")}><CategoryIcon name={item.name} icon={item.icon} color={selected ? "currentColor" : item.color} size={18} /></span><span className="category-label max-w-full text-[11px] font-semibold">{item.name}</span></button>;
          })}
          <Link href="/manage" className="add-category-card category-card flex flex-col items-center justify-center gap-1 rounded-2xl bg-raised px-2 text-center text-accent"><span className="category-icon-well grid place-items-center rounded-full bg-accent-soft"><Plus className="h-5 w-5" /></span><span className="text-[11px] font-semibold">Add category</span></Link>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="label">Payment method</p>
        <div className="flex flex-wrap gap-2">
          {store.paymentMethods.map((item) => <button type="button" key={item.id} aria-pressed={paymentMethodId === item.id} className={cx("chip", paymentMethodId === item.id && "chip-active")} onClick={() => setPaymentMethodId(item.id)}>{item.name}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DatePicker value={spentAt} onChange={setSpentAt} />
        <div className="grid gap-2">
          <p className="label">Tags</p>
          <div className="tag-rail flex gap-2 overflow-x-auto pb-1">
            {store.tags.map((tag) => <button type="button" key={tag.id} aria-pressed={selectedTagIds.includes(tag.id)} className={cx("tag-card flex flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition", selectedTagIds.includes(tag.id) ? "bg-accent-soft text-accent-strong" : "bg-raised text-text")} onClick={() => toggleTag(tag.id)}><span className="grid h-6 w-6 place-items-center rounded-full"><Tags className="h-4 w-4" /></span><span className="max-w-full truncate text-[11px] font-semibold">{tag.name}</span></button>)}
            <button type="button" className="add-tag-card tag-card flex flex-col items-center justify-center gap-1 rounded-2xl bg-raised px-2 text-center text-accent transition hover:bg-accent-soft" onClick={() => setAddingTag((current) => !current)}><span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft"><Plus className="h-4 w-4" /></span><span className="text-[11px] font-semibold">Add tag</span></button>
          </div>
          {addingTag && <div className="tag-creator flex gap-2"><input autoFocus className="input min-h-11" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTag(); }} placeholder="New tag" /><button type="button" className="control min-h-11 bg-text px-4 text-bg" onClick={addTag}>Add</button></div>}
        </div>
      </div>
      <label className="label" htmlFor="expense-note">Note (optional)<input id="expense-note" className="input mt-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was this for?" /></label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="control justify-center bg-text text-bg" onClick={save}><Check className="h-5 w-5" />{editing ? "Save changes" : "Save expense"}</button>
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

function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
      <p className="label">Date</p>
      <button type="button" className="input mt-2 flex w-full items-center justify-between text-left" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{formatDateLabel(value)}</span>
        <CalendarDays className="h-5 w-5 text-text" />
      </button>
      {open && <div className="calendar-popover absolute inset-x-0 top-[calc(100%+8px)] z-40 rounded-2xl bg-surface p-3 shadow-soft" role="dialog" aria-label="Choose date">
        <div className="flex items-center justify-between">
          <button type="button" className="icon-button h-9 w-9" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <p className="text-sm font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
          <button type="button" className="icon-button h-9 w-9" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-muted">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) => date ? <button type="button" key={date.toISOString()} className={cx("grid aspect-square place-items-center rounded-full text-sm transition hover:bg-raised", dateInputValue(date) === dateInputValue(selected) && "bg-accent text-white")} onClick={() => { onChange(dateInputValue(date)); setOpen(false); }}>{date.getDate()}</button> : <span key={`empty-${index}`} />)}
        </div>
      </div>}
    </div>
  );
}

function HistoryView({ onEditExpense }: { onEditExpense: (id: string) => void }) {
  const store = useAppStore();
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
        <div><p className="eyebrow">Your spending, in context</p><h2 className="mt-1 text-2xl font-bold">History</h2></div>
        <label className="relative block"><Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-muted" /><input className="input pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes or categories" /></label>
        <div className="flex flex-wrap gap-2">
          {(["week", "month", "all"] as const).map((item) => <button key={item} className={cx("chip", range === item && "chip-active")} onClick={() => setRange(item)}>{item === "all" ? "All time" : item === "week" ? "This week" : "This month"}</button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={cx("chip shrink-0", category === "all" && "chip-active")} onClick={() => setCategory("all")}>All categories</button>
          {store.categories.filter((item) => !item.archivedAt).map((item) => <button key={item.id} className={cx("chip shrink-0", category === item.id && "chip-active")} onClick={() => setCategory(item.id)}>{item.name}</button>)}
        </div>
        <p className="text-[13px] text-muted">{filtered.length} {filtered.length === 1 ? "expense" : "expenses"}</p>
      </div>
      <ExpenseList expenses={filtered} onEdit={onEditExpense} />
    </section>
  );
}

function ExpenseList({ expenses, onEdit }: { expenses: Expense[]; onEdit?: (id: string) => void }) {
  const store = useAppStore();
  if (!expenses.length) return <div className="rounded-2xl bg-raised p-6 text-center text-muted">No expenses yet.</div>;
  return (
    <div>
      {expenses.map((expense) => {
        const category = store.categories.find((item) => item.id === expense.categoryId);
        return (
          <div key={expense.id} className="expense-row grid min-h-[68px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-b border-line px-2 py-2 transition hover:bg-raised active:scale-[0.995]">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><CategoryIcon icon={category?.icon} /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{category?.name ?? "Expense"}</p>
              <p className="truncate text-[13px] text-muted">{expense.note || formatExpenseDate(expense.spentAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              {onEdit ? <button type="button" onClick={() => onEdit(expense.id)} className="hidden min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-text sm:flex">Edit</button> : <Link href={`/add-expense?edit=${expense.id}`} className="hidden min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-text sm:flex">Edit</Link>}
              <button className="icon-button" aria-label="Delete expense" onClick={() => store.deleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></button>
              <p className="w-20 text-right text-sm font-semibold tabular-nums sm:w-24">{formatMoney(expense.amount, expense.currency)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightsView() {
  const store = useAppStore();
  const expenses = visibleExpenses(store.expenses);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [mode, setMode] = useState<"expenses" | "income">("expenses");
  const currency = store.profile?.currency ?? "USD";
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
      <div className="flex items-center justify-between"><div><p className="eyebrow">Your money, in focus</p><h2 className="mt-1 text-2xl font-bold">Insights</h2></div><ChartNoAxesColumnIncreasing className="h-6 w-6 text-accent" /></div>
      <div className="grid min-h-12 grid-cols-2 rounded-full bg-raised p-1">
        {(["expenses", "income"] as const).map((item) => <button key={item} className={cx("control min-h-10 justify-center rounded-full bg-transparent text-sm", mode === item && "bg-surface shadow-sm")} onClick={() => setMode(item)}>{item === "expenses" ? "Expenses" : "Income"}</button>)}
      </div>
      {mode === "income" ? <div className="rounded-xl bg-raised p-6 text-center text-sm text-muted">Income is not enabled. Walletly is focused on spending for now.</div> : <>
        <section className="grid gap-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[13px] text-muted">{period === "week" ? "This week" : "This month"} · {currency}</p><p className="mt-1 text-4xl font-bold tabular-nums">{formatMoney(total, currency)}</p></div><div className="flex gap-1">{(["week", "month"] as const).map((item) => <button key={item} className={cx("chip", period === item && "chip-active")} onClick={() => setPeriod(item)}>{item === "week" ? "Week" : "Month"}</button>)}</div></div>
          <div className="flex min-h-[190px] items-end gap-2 sm:gap-4">
            {bars.map((bar) => <div key={bar.label} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-36 w-full items-end overflow-hidden rounded-full bg-raised"><div className="w-full rounded-full bg-accent" style={{ height: `${Math.max(bar.amount ? 8 : 2, Math.min(100, (bar.amount / max) * 100))}%` }} /></div><span className="text-[11px] font-semibold text-muted">{bar.label}</span></div>)}
          </div>
        </section>
        <section className="grid gap-4"><div className="flex items-center justify-between"><h3 className="section-title">Where it went</h3><span className="text-[13px] text-muted">{totals.length} {totals.length === 1 ? "category" : "categories"}</span></div>{totals.length ? <div className="grid gap-3">{totals.slice(0, 6).map(({ category, total: amount, color }) => { const share = total > 0 ? Math.round((amount / total) * 100) : 0; return <div key={category.id} className="flex min-h-12 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft" style={{ color }}><CategoryIcon icon={category.icon} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{category.name}</p><p className="text-[11px] text-muted">{share}% of total</p></div><p className="text-sm font-semibold tabular-nums">{formatMoney(amount, currency)}</p></div>; })}</div> : <p className="text-[13px] text-muted">Log a few expenses to see your spending shape.</p>}</section>
      </>}
    </section>
  );
}

function ManageView() {
  const store = useAppStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconName>("more-horizontal");
  const [payment, setPayment] = useState("");
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel">
        <h2 className="section-title">Categories</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="New category" />
          <button className="control justify-center bg-accent text-white" onClick={() => { store.addCategory(name, icon); setName(""); }}>Add</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{categoryIconNames.map((item) => <button key={item} className={cx("icon-button", icon === item && "bg-text text-bg")} onClick={() => setIcon(item)}><CategoryIcon name={item} /></button>)}</div>
        <div className="mt-5 grid gap-2">{store.categories.filter((item) => !item.archivedAt).map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between rounded-2xl bg-raised px-3"><span className="flex items-center gap-2"><CategoryIcon name={item.icon} />{item.name}</span>{item.kind === "custom" && <button className="icon-button" onClick={() => store.archiveCategory(item.id)}><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
      </section>
      <section className="panel">
        <h2 className="section-title">Payment methods and tags</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="New payment method" />
          <button className="control justify-center bg-accent text-white" onClick={() => { store.ensurePaymentMethods([payment]); setPayment(""); }}>Add</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{store.paymentMethods.map((item) => <span key={item.id} className="chip">{item.name}</span>)}</div>
        <h3 className="mt-8 font-semibold">Reusable tags</h3>
        <div className="mt-3 flex flex-wrap gap-2">{store.tags.length ? store.tags.map((tag) => <span key={tag.id} className="chip"><Tags className="h-4 w-4" />{tag.name}</span>) : <p className="text-sm text-muted">Tags appear here as you add them to expenses.</p>}</div>
      </section>
    </div>
  );
}

function ProfileView() {
  const store = useAppStore();
  const [name, setName] = useState(store.user?.name ?? "");
  const active = visibleExpenses(store.expenses);
  const monthTotal = active.filter((expense) => new Date(expense.spentAt) >= startOfMonth()).reduce((sum, expense) => sum + expense.amount, 0);
  const loggedDays = new Set(active.map((expense) => new Date(expense.spentAt).toDateString())).size;
  const providerLabel = store.user?.isDemo ? "Demo workspace" : store.user?.provider === "google" ? "Google account" : "Email account";
  return (
    <section className="grid max-w-2xl gap-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow">Account</p><h2 className="mt-1 text-2xl font-bold">Profile</h2></div><Link href="/settings" aria-label="Open settings" className="icon-button"><Settings className="h-5 w-5" /></Link></div>
      <div className="flex items-center gap-4"><div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-accent-soft text-xl font-bold text-accent">{store.user?.name?.slice(0, 2).toUpperCase() || "W"}</div><div className="min-w-0"><p className="truncate text-[17px] font-semibold">{store.user?.name ?? store.user?.email ?? "Your wallet"}</p><p className="truncate text-[13px] text-muted">{store.user?.email ?? "Local demo account"}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-success"><ShieldCheck className="h-3.5 w-3.5" />{providerLabel}</p></div></div>
      <div className="grid grid-cols-3 gap-3 py-2"><ProfileStat value={String(active.length)} label="Expenses" /><ProfileStat value={formatMoney(monthTotal, store.profile?.currency ?? "USD")} label={`This month · ${store.profile?.currency ?? "USD"}`} compact /><ProfileStat value={String(loggedDays)} label="Logged days" /></div>
      <section className="grid gap-4"><h3 className="section-title">Basic information</h3><label className="label" htmlFor="profile-name">Name<input id="profile-name" className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Add your name" /></label><button className="control justify-center bg-surface text-text shadow-sm" onClick={() => void store.updateDisplayName(name)}><Pencil className="h-4 w-4" />Save changes</button></section>
      <section className="grid gap-2"><h3 className="section-title mb-2">Your Walletly</h3><ProfileInfo icon={CalendarDays} label="Member since" detail={store.user?.createdAt ? new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(store.user.createdAt)) : "This device"} /><ProfileInfo icon={Cloud} label="Sync status" detail={!store.cloudEnabled ? "Stored on this device" : !store.isOnline ? "Offline, changes are safe" : "Cloud sync is on"} /><Link href="/settings" className="flex min-h-16 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><Settings className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Preferences and privacy</span><span className="block text-[13px] text-muted">Themes, reminders, data and legal</span></span><ChevronRight className="h-4 w-4 text-muted" /></Link></section>
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
  const { language, setLanguage } = useI18n();
  const { mode, setMode } = useLedgerTheme();
  const [reminders, setReminders] = useState(false);
  useEffect(() => { void notificationsEnabled().then(setReminders); }, []);

  function exportData(type: "json" | "csv") {
    const rows = visibleExpenses(store.expenses);
    const content = type === "json"
      ? JSON.stringify({ profile: store.profile, categories: store.categories, paymentMethods: store.paymentMethods, tags: store.tags, expenses: rows }, null, 2)
      : ["id,amount,currency,spent_at,category,note", ...rows.map((expense) => {
          const category = store.categories.find((item) => item.id === expense.categoryId)?.name ?? "";
          return [expense.id, expense.amount, expense.currency, expense.spentAt, category, expense.note].map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",");
        })].join("\n");
    const blob = new Blob([content], { type: type === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `walletly-export.${type}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel">
        <h2 className="section-title">Settings</h2>
        <div className="mt-5 grid gap-3">
          <Segment label="Appearance" options={["system", "light", "dark"]} value={mode} onChange={(value) => setMode(value as typeof mode)} icons={[Settings, Sun, Moon]} />
          <Segment label="Language" options={["en", "ru", "uz"]} value={language} onChange={(value) => setLanguage(value as typeof language)} />
          <button className="control justify-between bg-raised" onClick={async () => { const enabled = await setDailyReminderEnabled(!reminders); setReminders(enabled); }}>
            <span className="flex items-center gap-2"><Bell className="h-5 w-5" /> Daily reminder</span><span>{reminders ? "On" : "Off"}</span>
          </button>
          <p className="text-xs leading-5 text-muted">Reliable closed-app reminder delivery requires a backend schedule. This PWA requests permission only from this user action and uses service worker notifications; see deployment docs for the Supabase cron option.</p>
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">Data and account</h2>
        <div className="mt-5 grid gap-3">
          <button className="control justify-between bg-raised" onClick={() => exportData("json")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> Export JSON</span><ChevronRight className="h-5 w-5" /></button>
          <button className="control justify-between bg-raised" onClick={() => exportData("csv")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> Export CSV</span><ChevronRight className="h-5 w-5" /></button>
          <Link href="/privacy" className="control justify-between bg-raised"><span className="flex items-center gap-2"><Shield className="h-5 w-5" /> Privacy policy</span><ChevronRight className="h-5 w-5" /></Link>
          <Link href="/terms" className="control justify-between bg-raised">Terms of service<ChevronRight className="h-5 w-5" /></Link>
          <Link href="/cookies" className="control justify-between bg-raised">Cookie policy<ChevronRight className="h-5 w-5" /></Link>
          <button className="control justify-between bg-raised" onClick={() => void store.signOut()}><span className="flex items-center gap-2"><LogOut className="h-5 w-5" /> Sign out</span></button>
          <button className="control justify-between bg-danger/10 text-danger" onClick={() => { if (confirm("Delete your Walletly account and local data?")) void store.deleteAccount(); }}><span className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete account</span></button>
        </div>
      </section>
    </div>
  );
}

function Segment({ label, options, value, onChange, icons }: { label: string; options: string[]; value: string; onChange: (value: string) => void; icons?: Array<typeof Settings> }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <div className="grid grid-cols-3 rounded-2xl bg-raised p-1">
        {options.map((option, index) => {
          const Icon = icons?.[index];
          return <button key={option} className={cx("control min-h-11 justify-center rounded-xl bg-transparent capitalize", value === option && "bg-surface shadow-soft")} onClick={() => onChange(option)}>{Icon && <Icon className="h-4 w-4" />}{option}</button>;
        })}
      </div>
    </div>
  );
}

function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(localStorage.getItem(CONSENT_KEY) !== "true" || localStorage.getItem(COOKIE_CONSENT_KEY) !== "true"), []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-xl rounded-[24px] bg-text p-3 text-bg shadow-glass sm:p-4 lg:bottom-6">
      <p className="text-xs leading-5 sm:text-sm">Walletly stores essential app data locally and uses Supabase for auth/sync when you sign in. Confirm age consent and cookie preferences to continue.</p>
      <div className="mt-2 flex gap-2 sm:mt-3">
        <button className="control min-h-10 bg-bg px-4 py-1.5 text-text" onClick={() => { localStorage.setItem(CONSENT_KEY, "true"); localStorage.setItem(COOKIE_CONSENT_KEY, "true"); setVisible(false); }}>Accept</button>
        <Link href="/privacy" className="control min-h-10 bg-bg/10 px-4 py-1.5">Review</Link>
      </div>
    </div>
  );
}

function InstallPrompt() {
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
  return <button className="fixed right-4 top-4 z-40 hidden rounded-2xl bg-text px-4 py-3 text-sm font-semibold text-bg shadow-glass md:block" onClick={() => void (event as Event & { prompt?: () => Promise<void> }).prompt?.()}>Install Walletly</button>;
}
