"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CalendarDays, Check, ChevronRight, Cloud, Download, Eye, EyeOff, Home, LineChart, LogOut, Menu, Pencil, Plus, RefreshCw, Search, Settings, Shield, ShieldCheck, SlidersHorizontal, Tags, Trash2, User, X } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CategoryIcon, categoryIconNames } from "@/components/category-icon";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { AiProcessingNotice } from "@/components/spending/ai-processing-notice";
import { CaptureComposer } from "@/components/spending/capture-composer";
import { CaptureDetail } from "@/components/spending/capture-detail";
import { CaptureList } from "@/components/spending/capture-list";
import { FolderList } from "@/components/spending/folder-list";
import { SpendingSearch } from "@/components/spending/spending-search";
import { usePendingCaptureParser } from "@/components/spending/use-pending-capture-parser";
import { captureParseIssueMessage, type CaptureParseIssue } from "@/lib/capture-parse-issue";
import { DisplayPreferences } from "@/components/display-preferences";
import { categoryIconLabel, categoryLabel, paymentLabel } from "@/lib/display-labels";
import { DatePicker } from "@/components/date-picker";
import { FloatingAddButton } from "@/components/floating-add-button";
import { CashFlowView } from "@/components/cash-flow";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { GoogleLogo } from "@/components/google-logo";
import { SavingsGoalsView } from "@/components/savings-goals";
import { consumeRollingWindow, formatShortCountdown } from "@/lib/action-rate-limit";
import { CONSENT_KEY, COOKIE_CONSENT_KEY, DEFAULT_PAYMENT_METHODS, SUPPORTED_CURRENCIES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { parseAmountValue } from "@/lib/currency-input";
import { exportNolaData } from "@/lib/export-data";
import { exportSpendingPdf } from "@/lib/export-pdf";
import { budgetStatus, monthKey } from "@/lib/budgeting";
import { findDailyCapture } from "@/lib/spending-captures";
import { extractHashtags } from "@/lib/spending-parser";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { notificationsEnabled, setDailyReminderEnabled } from "@/lib/notifications";
import { useAppStore } from "@/lib/app-store";
import type { Category, CategoryIconName, Expense, PersistedAppData, SpendingCapture, SpendingFolder } from "@/lib/types";

type View = "home" | "add" | "capture" | "folders" | "insights" | "goals" | "manage" | "profile" | "settings";

function GoalsNavIcon({ size = 22 }: { size?: number }) {
  return <span className="goals-nav-emoji" style={{ fontSize: size }} aria-hidden="true">🎯</span>;
}

const navItems = [
  { href: "/", view: "home", labelKey: "nav.spending", icon: Home },
  { href: "/insights", view: "insights", labelKey: "nav.insights", icon: LineChart },
  { href: "/goals", view: "goals", labelKey: "nav.goals", icon: GoalsNavIcon },
  { href: "/profile", view: "profile", labelKey: "nav.profile", icon: User },
] as const;

function visibleExpenses(expenses: Expense[]) {
  return expenses.filter((expense) => !expense.deletedAt).sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
}

function CaptureFeedback({ capture, message, canRetry, canRetrySync, canSignIn, onRetry, onRetrySync, onSignIn, onUndo }: { capture: SpendingCapture; message: string; canRetry: boolean; canRetrySync: boolean; canSignIn: boolean; onRetry: () => void; onRetrySync: () => void; onSignIn: () => void; onUndo: () => void }) {
  const { t } = useI18n();
  return <aside className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg sm:inset-x-6 sm:bottom-6 sm:p-4" aria-live="polite" aria-atomic="false">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-text">{message}</p>
      <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-muted">{capture.sourceText}</p>
    </div>
    {canRetrySync && <button type="button" className="control min-h-11 shrink-0 justify-center bg-raised px-3 text-sm font-semibold text-text" onClick={onRetrySync}>{t("capture.retrySync")}</button>}
    {canRetry && <button type="button" className="control min-h-11 shrink-0 justify-center bg-raised px-3 text-sm font-semibold text-text" onClick={onRetry}>{t("capture.retry")}</button>}
    {canSignIn && <button type="button" className="control min-h-11 shrink-0 justify-center bg-raised px-3 text-sm font-semibold text-text" onClick={onSignIn}>{t("capture.signInAgain")}</button>}
    <button type="button" className="control min-h-11 shrink-0 justify-center bg-accent px-3 text-sm font-semibold text-on-accent" onClick={onUndo}>{t("history.undo")}</button>
  </aside>;
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

const CAPTURE_RESUME_KEY = "nola.capture-auth-resume.v1";

function saveCaptureResume(value: { draftText?: string; captureId?: string }) {
  try { sessionStorage.setItem(CAPTURE_RESUME_KEY, JSON.stringify(value)); } catch { /* Keep the current view if session storage is unavailable. */ }
}

function clearCaptureResume() {
  try { sessionStorage.removeItem(CAPTURE_RESUME_KEY); } catch { /* Ignore unavailable session storage. */ }
}



export function NolaApp({ view, overlay, captureId, folderId }: { view: View; overlay?: "add"; captureId?: string; folderId?: string }) {
  const store = useAppStore();
  const { t } = useI18n();
  const router = useRouter();
  const [expenseSheet, setExpenseSheet] = useState<string | "new" | null>(() => overlay === "add" ? "new" : null);
  const [expenseInitialNote, setExpenseInitialNote] = useState("");
  const [captureComposerOpen, setCaptureComposerOpen] = useState(false);
  const [captureEditorActive, setCaptureEditorActive] = useState(false);
  const [captureFolderId, setCaptureFolderId] = useState<string | null>(null);
  const [captureDraftText, setCaptureDraftText] = useState("");
  const [returnToCaptureAfterExpense, setReturnToCaptureAfterExpense] = useState(false);
  const [captureFeedbackId, setCaptureFeedbackId] = useState<string | null>(null);
  const captureReturnFocus = useRef<HTMLElement | null>(null);
  const captureParser = usePendingCaptureParser({ paused: captureComposerOpen || captureEditorActive });
  const needsAuth = store.hydrated && !store.user;
  const needsOnboarding = store.hydrated && store.user && !store.profile && view !== "settings";

  useEffect(() => {
    if (!store.hydrated || !store.user) return;
    try {
      const saved = sessionStorage.getItem(CAPTURE_RESUME_KEY);
      if (!saved) return;
      const resume = JSON.parse(saved) as { draftText?: unknown; captureId?: unknown };
      if (typeof resume.draftText === "string" && resume.draftText.length <= 4000) {
        setCaptureDraftText(resume.draftText);
        setCaptureComposerOpen(true);
      } else if (typeof resume.captureId === "string") {
        setCaptureFeedbackId(resume.captureId);
      }
      clearCaptureResume();
    } catch {
      clearCaptureResume();
    }
  }, [store.hydrated, store.user?.id]);

  function openExpenseSheet(editId?: string, initialNote = "") {
    setReturnToCaptureAfterExpense(false);
    captureReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setExpenseInitialNote(initialNote);
    setExpenseSheet(editId ?? "new");
  }

  function closeExpenseSheet() {
    const returnToCapture = returnToCaptureAfterExpense;
    setExpenseSheet(null);
    setExpenseInitialNote("");
    setReturnToCaptureAfterExpense(false);
    if (returnToCapture) setCaptureComposerOpen(true);
    if (overlay) router.back();
  }

  function completeExpenseSheet() {
    setExpenseSheet(null);
    setExpenseInitialNote("");
    setReturnToCaptureAfterExpense(false);
    setCaptureDraftText("");
    setCaptureComposerOpen(false);
    restoreCaptureFocus();
    if (overlay) router.back();
  }

  function openCaptureComposer(targetFolderId: string | null = null) {
    captureReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const now = new Date();
    const todayCapture = store.user ? findDailyCapture(store.spendingCaptures, store.user.id, now) : null;
    if (todayCapture) {
      router.push(`/captures/${encodeURIComponent(todayCapture.id)}`);
      return;
    }
    setCaptureFolderId(targetFolderId);
    setCaptureComposerOpen(true);
  }

  function restoreCaptureFocus() {
    requestAnimationFrame(() => {
      if (captureReturnFocus.current?.isConnected) captureReturnFocus.current.focus();
      else document.querySelector<HTMLElement>("[data-dialog-return-focus]")?.focus();
    });
  }

  function undoCapture(captureId: string) {
    store.undoSpendingCapture(captureId);
    setCaptureFeedbackId(null);
    restoreCaptureFocus();
  }

  const feedbackCapture = captureFeedbackId ? store.spendingCaptures.find((item) => item.id === captureFeedbackId && !item.deletedAt) : undefined;
  const feedbackIssue = captureFeedbackId ? captureParser.issues[captureFeedbackId] : undefined;
  const feedbackSyncPending = feedbackCapture ? store.syncQueue.some((operation) => operation.table === "spending_captures" && operation.recordId === feedbackCapture.id && operation.action === "upsert") : false;
  const captureFeedbackMessage = feedbackCapture
    ? feedbackIssue ? captureParseIssueMessage(feedbackIssue, t)
        : feedbackCapture.parseStatus === "parsed" ? t("capture.parseComplete").replace("{count}", String(feedbackCapture.parsedItems?.length ?? 0))
          : feedbackCapture.parseStatus === "needs_retry" ? t("capture.retryDetail")
            : feedbackCapture.parseStatus === "processing" ? t("capture.processing")
              : !store.isOnline ? t("capture.offline")
                : feedbackSyncPending ? t("capture.syncPending")
                : !store.profile?.aiParsingEnabled ? t("capture.paused")
                  : t("capture.saved")
    : "";

  if (!store.hydrated) {
    return <div className="grid min-h-dvh place-items-center px-6 text-muted">{t("common.loading")}</div>;
  }

  if (needsAuth) return <AuthScreen />;
  if (needsOnboarding) return <OnboardingScreen />;

  const activeNavView: View = view === "capture" || view === "folders" ? "home" : view;
  const workspaceView = view === "home" || view === "capture" || view === "folders";

  return (
    <div className="min-h-dvh bg-bg text-text">
      <main className="app-shell">
        <DesktopNav active={activeNavView} />
        <section className="min-w-0">
          <TopBar />
          {workspaceView && <SpendingWorkspace
            mode={view === "capture" ? "capture" : view === "folders" ? "folders" : "home"}
            captureId={captureId}
            folderId={folderId}
            issues={captureParser.issues}
            onCapture={openCaptureComposer}
            onEditExpense={openExpenseSheet}
            onRetryCapture={captureParser.retryCapture}
            onCaptureEditorActive={setCaptureEditorActive}
            onAddManualExpense={(sourceText) => openExpenseSheet(undefined, sourceText)}
            onSignInCapture={(id) => {
              const capture = store.spendingCaptures.find((item) => item.id === id && !item.deletedAt);
              if (!capture) return;
              if (store.user?.isDemo) {
                saveCaptureResume({ draftText: capture.sourceText });
                setCaptureDraftText(capture.sourceText);
                setCaptureComposerOpen(true);
              } else saveCaptureResume({ captureId: capture.id });
              void store.signOut();
            }}
          />}
          {view === "add" && <ExpenseForm onSaved={() => router.push("/")} />}
          {view === "insights" && <InsightsView onAddExpense={() => openExpenseSheet()} onEditExpense={openExpenseSheet} />}
          {view === "goals" && <GoalsView />}
          {view === "manage" && <ManageView />}
          {view === "profile" && <ProfileView />}
          {view === "settings" && <SettingsView />}
        </section>
      </main>
      <MobileNav active={activeNavView} />
      {!workspaceView && view !== "insights" && view !== "goals" && <FloatingAddButton label={t("capture.open")} onClick={() => openCaptureComposer()} />}
      {expenseSheet && <ExpenseSheet editId={expenseSheet === "new" ? undefined : expenseSheet} initialNote={expenseInitialNote} onClose={closeExpenseSheet} onSaved={completeExpenseSheet} />}
      {captureComposerOpen && <CaptureComposer folderId={captureFolderId} initialText={captureDraftText} onSaved={(id) => { setCaptureFeedbackId(id); setCaptureDraftText(""); }} onClose={() => { setCaptureComposerOpen(false); setCaptureFolderId(null); setCaptureDraftText(""); restoreCaptureFocus(); }} onSignIn={(sourceText) => { saveCaptureResume({ draftText: sourceText }); setCaptureDraftText(sourceText); void store.signOut(); }} onManualEntry={(sourceText) => { setCaptureComposerOpen(false); setCaptureDraftText(sourceText); setExpenseInitialNote(sourceText); setReturnToCaptureAfterExpense(true); setExpenseSheet("new"); }} />}
      {feedbackCapture && <CaptureFeedback capture={feedbackCapture} message={captureFeedbackMessage} canRetry={(feedbackCapture.parseStatus === "needs_retry" || feedbackIssue === "sync") && feedbackIssue !== "signIn"} canRetrySync={feedbackCapture.parseStatus === "pending" && feedbackSyncPending} canSignIn={feedbackIssue === "signIn"} onRetry={() => captureParser.retryCapture(feedbackCapture.id)} onRetrySync={store.retrySync} onSignIn={() => { if (store.user?.isDemo) { saveCaptureResume({ draftText: feedbackCapture.sourceText }); setCaptureDraftText(feedbackCapture.sourceText); setCaptureComposerOpen(true); } else saveCaptureResume({ captureId: feedbackCapture.id }); void store.signOut(); }} onUndo={() => undoCapture(feedbackCapture.id)} />}
      <ConsentBanner />
      <InstallPrompt visible={view === "profile" || view === "settings"} />
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
    setBusy(true); setMessage(false);
    try { await store.signInSocial("google"); } catch { setMessage(true); } finally { setBusy(false); }
  }
  return <main className="grid min-h-dvh place-items-center bg-bg px-4 py-8 text-text">
    <section className="auth-panel">
      <p className="brand-wordmark" aria-label="Nola">Nola</p>
      <h1 className="auth-heading">{t("auth.title")}</h1>
      <p className="auth-intro">{t("auth.description")}</p>
      <div className="mt-6 grid gap-3">
        <button className="control w-full justify-center border border-control-edge bg-surface text-text hover:bg-raised" disabled={busy} onClick={() => void submitGoogle()}><GoogleLogo />{t("auth.continueGoogle")}</button>
        <button className="control w-full justify-center bg-accent text-on-accent" disabled={busy} onClick={() => void store.signInDemo()}>{t("auth.tryDemo")}</button>
      </div>
      {message && <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{t("auth.googleError")}</p>}
      <div className="preferences-compact"><DisplayPreferences compact /></div>
      <p className="mt-6 text-xs leading-5 text-muted">{t("auth.consent")}</p>
    </section>
  </main>;
}

function OnboardingScreen() {
  const store = useAppStore();
  const { t } = useI18n();
  const [currency, setCurrency] = useState("USD");
  const [payment, setPayment] = useState<string>(DEFAULT_PAYMENT_METHODS[0]);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-8 text-text">
      <section className="w-full max-w-md">

        <h1 className="screen-title">{t("onboarding.title")}</h1>
        <div className="mt-6">
          <p className="label">{t("onboarding.currency")}</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {SUPPORTED_CURRENCIES.map((item) => (
              <button key={item} className={cx("chip min-w-0 justify-center px-3", currency === item && "chip-active")} onClick={() => setCurrency(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <p className="label">{t("onboarding.payment")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEFAULT_PAYMENT_METHODS.map((item) => (
              <button key={item} className={cx("control min-w-0 justify-center gap-2 whitespace-nowrap bg-raised px-3 text-sm sm:px-4 sm:text-base", payment === item && "text-accent underline decoration-2 underline-offset-4")} onClick={() => setPayment(item)}>
                <span>{paymentLabel(item, t)}</span>{payment === item && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        <button className="control mt-6 w-full justify-center bg-accent text-on-accent" onClick={() => store.completeOnboarding(currency, payment)}>{t("onboarding.enter")}</button>
        <div className="preferences-compact"><DisplayPreferences compact /></div>
      </section>
    </main>
  );
}

function DesktopNav({ active }: { active: View }) {
  const { t } = useI18n();
  return <aside className="desktop-nav">
    <nav aria-label={t("nav.main")} className="grid gap-1">
      {navItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="desktop-nav-link" aria-label={t(item.labelKey)} title={t(item.labelKey)} aria-current={active === item.view ? "page" : undefined}><span className="nav-icon-background"><Icon size={22} aria-hidden="true" /></span><span className="nav-link-label">{t(item.labelKey)}</span></Link>; })}
    </nav>
    <nav className="mt-auto grid gap-1" aria-label={t("settings.workspace")}>
      <Link href="/manage" className="desktop-nav-link" aria-label={t("home.manage")} title={t("home.manage")} aria-current={active === "manage" ? "page" : undefined}><span className="nav-icon-background"><SlidersHorizontal size={22} aria-hidden="true" /></span><span className="nav-link-label">{t("home.manage")}</span></Link>
      <Link href="/settings" className="desktop-nav-link" aria-label={t("nav.settings")} title={t("nav.settings")} aria-current={active === "settings" ? "page" : undefined}><span className="nav-icon-background"><Settings size={22} aria-hidden="true" /></span><span className="nav-link-label">{t("nav.settings")}</span></Link>
    </nav>
  </aside>;
}

function MobileNav({ active }: { active: View }) {
  const { t } = useI18n();
  return <nav className="mobile-nav" aria-label={t("nav.main")}><div className="mobile-nav-inner">
    {navItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="mobile-nav-link" aria-label={t(item.labelKey)} title={t(item.labelKey)} aria-current={active === item.view ? "page" : undefined}><span className="nav-icon-background"><Icon size={22} aria-hidden="true" /></span><span className="nav-link-label">{t(item.labelKey)}</span></Link>; })}
  </div></nav>;
}

function TopBar() {
  const store = useAppStore();
  const { t } = useI18n();
  return <header className="app-header">
    <div>{(!store.isOnline || store.syncError) && <button aria-label={t("nav.refreshSync")} className="icon-button" onClick={store.retrySync}><RefreshCw size={20} /></button>}</div>
    <div aria-hidden="true" />
    <div aria-hidden="true" />
  </header>;
}

function SpendingWorkspace({
  mode,
  captureId,
  folderId,
  issues,
  onCapture,
  onEditExpense,
  onRetryCapture,
  onCaptureEditorActive,
  onAddManualExpense,
  onSignInCapture,
}: {
  mode: "home" | "capture" | "folders";
  captureId?: string;
  folderId?: string;
  issues: Record<string, CaptureParseIssue>;
  onCapture: (folderId?: string | null) => void;
  onEditExpense: (id: string) => void;
  onRetryCapture: (captureId: string) => void;
  onCaptureEditorActive: (active: boolean) => void;
  onAddManualExpense: (sourceText: string) => void;
  onSignInCapture: (captureId: string) => void;
}) {
  const store = useAppStore();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [mobileFoldersMounted, setMobileFoldersMounted] = useState(false);
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const mobileFolderCloseTimer = useRef<number | null>(null);
  const mobileFolderOpenFrame = useRef<number | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<SpendingFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const selectedCategoryId = mode === "folders" ? searchParams.get("category") : null;
  const activeExpenses = visibleExpenses(store.expenses);
  const selectedCapture = mode === "capture"
    ? store.spendingCaptures.find((capture) => capture.id === captureId && !capture.deletedAt && capture.parseStatus !== "undone")
    : undefined;
  const selectedFolder = mode === "folders" && folderId
    ? store.spendingFolders.find((folder) => folder.id === folderId && !folder.deletedAt)
    : undefined;
  const selectedCategory = selectedCategoryId
    ? store.categories.find((category) => category.id === selectedCategoryId && !category.archivedAt)
    : undefined;
  const folderFilter = mode === "folders" ? folderId : undefined;
  const visibleCaptureCount = store.spendingCaptures.filter((capture) => !capture.deletedAt && capture.parseStatus !== "undone"
    && (folderFilter === undefined || capture.folderId === folderFilter)
    && (!selectedCategoryId || store.expenses.some((expense) => expense.captureId === capture.id && !expense.deletedAt && expense.categoryId === selectedCategoryId))).length;
  const visibleStandaloneCount = activeExpenses.filter((expense) => expense.captureId === null
    && (folderFilter === undefined || folderFilter === null)
    && (!selectedCategoryId || expense.categoryId === selectedCategoryId)).length;
  const searchExpenses = activeExpenses.filter((expense) => (!selectedCategoryId || expense.categoryId === selectedCategoryId)
    && (folderFilter === undefined || (expense.captureId
      ? store.spendingCaptures.some((capture) => capture.id === expense.captureId && !capture.deletedAt && capture.folderId === folderFilter)
      : folderFilter === null)));
  const searchCaptures = store.spendingCaptures.filter((capture) => !capture.deletedAt && capture.parseStatus !== "undone"
    && (folderFilter === undefined || capture.folderId === folderFilter)
    && (!selectedCategoryId || store.expenses.some((expense) => expense.captureId === capture.id && !expense.deletedAt && expense.categoryId === selectedCategoryId)));
  const workspaceTitle = selectedCapture
    ? t("capture.noteLabel")
    : selectedFolder?.name ?? (selectedCategory ? categoryLabel(selectedCategory, t) : t("nav.spending"));

  function openCapture(id: string) {
    router.push(`/captures/${encodeURIComponent(id)}`);
  }

  function openMobileFolders() {
    if (mobileFolderCloseTimer.current) window.clearTimeout(mobileFolderCloseTimer.current);
    mobileFolderCloseTimer.current = null;
    if (mobileFolderOpenFrame.current !== null) window.cancelAnimationFrame(mobileFolderOpenFrame.current);
    setMobileFoldersMounted(true);
    mobileFolderOpenFrame.current = window.requestAnimationFrame(() => {
      mobileFolderOpenFrame.current = null;
      setMobileFoldersOpen(true);
    });
  }

  function closeMobileFolders(afterClose?: () => void) {
    if (mobileFolderOpenFrame.current !== null) window.cancelAnimationFrame(mobileFolderOpenFrame.current);
    mobileFolderOpenFrame.current = null;
    setMobileFoldersOpen(false);
    if (mobileFolderCloseTimer.current) window.clearTimeout(mobileFolderCloseTimer.current);
    mobileFolderCloseTimer.current = window.setTimeout(() => {
      setMobileFoldersMounted(false);
      mobileFolderCloseTimer.current = null;
      afterClose?.();
    }, 240);
  }

  useEffect(() => () => {
    if (mobileFolderCloseTimer.current) window.clearTimeout(mobileFolderCloseTimer.current);
    if (mobileFolderOpenFrame.current !== null) window.cancelAnimationFrame(mobileFolderOpenFrame.current);
  }, []);

  function selectCategory(id: string) {
    closeMobileFolders();
    router.push(`/folders?category=${encodeURIComponent(id)}`);
  }

  function createFolder() {
    if (mobileFoldersMounted) closeMobileFolders(() => setFolderDialogOpen(true));
    else setFolderDialogOpen(true);
  }

  function deleteFolder(id: string) {
    const folder = store.spendingFolders.find((item) => item.id === id);
    if (!folder || !window.confirm(`${t("folders.deletePrompt")} “${folder.name}”?`)) return;
    store.deleteSpendingFolder(id);
    if (folderId === id) router.push("/");
  }

  const issue = selectedCapture ? issues[selectedCapture.id] : undefined;

  return <div className={`spending-workspace${mode === "folders" ? " folders-mode" : ""}${selectedCapture ? " has-selected-capture" : ""}`}>
    <aside className="spending-sidebar" aria-label={t("folders.title")}>
      <FolderList
        title={t("folders.title")}
        allLabel={t("folders.allSpending")}
        foldersLabel={t("folders.folders")}
        categoriesLabel={t("folders.categories")}
        createFolderLabel={t("folders.new")}
        folders={store.spendingFolders}
        captures={store.spendingCaptures}
        expenses={store.expenses}
        categories={store.categories}
        selectedFolderId={mode === "folders" ? folderId ?? null : null}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={selectCategory}
        onCreateFolder={createFolder}
        onRenameFolder={(id) => setRenamingFolder(store.spendingFolders.find((folder) => folder.id === id && !folder.deletedAt) ?? null)}
        onDeleteFolder={deleteFolder}
      />
    </aside>

    <section className="spending-list-pane" aria-labelledby="spending-workspace-title">
      <header className={`spending-list-header${mode === "home" ? " spending-list-header-home" : ""}`}>
        <div className={`spending-title-group${mode === "home" ? " spending-title-group-home" : ""}`}>
          {mode !== "capture" && <button type="button" className="mobile-sidebar-toggle" aria-label={t("folders.browse")} aria-expanded={mobileFoldersOpen} aria-controls={mobileFoldersMounted ? "mobile-folder-sidebar" : undefined} onClick={openMobileFolders}><Menu className="h-5 w-5" aria-hidden="true" /></button>}
          {mode === "home"
            ? <><h1 id="spending-workspace-title" className="sr-only">{t("nav.spending")}</h1><HomeSummary expenses={activeExpenses} /></>
            : <div className="min-w-0">
              <h1 id="spending-workspace-title" className="screen-title truncate">{workspaceTitle}</h1>
              <p className="mt-1 text-sm text-muted">{selectedCapture ? t("capture.linkedExpenses") : t("folders.itemCount").replace("{count}", String(visibleCaptureCount + visibleStandaloneCount))}</p>
            </div>}
        </div>
        <div className="spending-header-actions">
          {mode !== "capture" && <button type="button" className="control min-h-11 shrink-0 justify-center bg-accent px-3 text-sm font-semibold text-on-accent desktop-capture-action" aria-label={t("capture.open")} onClick={() => onCapture(mode === "folders" ? folderId ?? null : null)}><Pencil className="h-4 w-4" aria-hidden="true" /><span>{t("capture.open")}</span></button>}
        </div>
      </header>
      <div className="spending-list-scroll">
        {searchQuery.trim() ? <SpendingSearch
          captures={searchCaptures}
          expenses={searchExpenses}
          categories={store.categories}
          paymentMethods={store.paymentMethods}
          tags={store.tags}
          folders={store.spendingFolders}
          query={searchQuery}
          hideInput
          captureResultsLabel={t("capture.noteLabel")}
          expenseResultsLabel={t("history.expenses")}
          emptyLabel={t("history.nothingFound")}
          resultCountLabel={(count) => t("history.resultCount").replace("{count}", String(count)).replace("{label}", count === 1 ? t("search.result") : t("search.results"))}
          onOpenCapture={openCapture}
          onOpenExpense={onEditExpense}
        /> : <CaptureList
          captures={store.spendingCaptures}
          expenses={store.expenses}
          categories={store.categories}
          tags={store.tags}
          folders={store.spendingFolders}
          folderId={folderFilter}
          categoryId={selectedCategoryId}
          issues={issues}
          emptyLabel={t("capture.empty")}
          signInLabel={t("capture.signInForAi")}
          onOpenCapture={openCapture}
          onOpenExpense={onEditExpense}
          onRetryCapture={onRetryCapture}
          onSignInCapture={onSignInCapture}
        />}
      </div>
    </section>

    <aside className="spending-detail-pane" aria-label={t("capture.noteLabel")}>
      {selectedCapture
        ? <CaptureDetail
          capture={selectedCapture}
          expenses={store.expenses}
          categories={store.categories}
          paymentMethods={store.paymentMethods}
          tags={store.tags}
          folders={store.spendingFolders}
          issue={issue}
          sourceLabel={t("capture.noteLabel")}
          linkedExpensesLabel={t("capture.linkedExpenses")}
          emptyExpensesLabel={t("capture.emptyExpenses")}
          folderLabel={t("folders.moveTo")}
          unfiledLabel={t("folders.unfiled")}
          closeLabel={t("common.back")}
          reparseLabel={t("capture.reparse")}
          editExpenseLabel={t("common.edit")}
          signInLabel={t("capture.signInForAi")}
          onClose={() => router.back()}
          onRetry={() => onRetryCapture(selectedCapture.id)}
          onSignIn={() => onSignInCapture(selectedCapture.id)}
          onReparse={(sourceText) => {
            const text = sourceText ?? selectedCapture.sourceText;
            store.editCaptureSourceText(selectedCapture.id, text, store.ensureTags(extractHashtags(text)));
          }}
          onEditExpense={(expense) => onEditExpense(expense.id)}
          onSaveSourceText={(id, text) => store.editCaptureSourceText(id, text, store.ensureTags(extractHashtags(text)))}
          onPauseParsingChange={onCaptureEditorActive}
          onMoveToFolder={(id, targetFolderId) => store.moveCaptureToFolder(id, targetFolderId)}
          onManualEntry={onAddManualExpense}
        />
        : mode === "home" ? <div className="spending-overview"><BudgetPreview /></div>
          : <div className="spending-detail-empty"><span className="spending-empty-mark" aria-hidden="true">N</span><p>{t("capture.selectNote")}</p></div>}
    </aside>

    {mobileFoldersMounted && <MobileFolderDrawer
      id="mobile-folder-sidebar"
      open={mobileFoldersOpen}
      title={t("folders.title")}
      allLabel={t("folders.allSpending")}
      foldersLabel={t("folders.folders")}
      categoriesLabel={t("folders.categories")}
      createFolderLabel={t("folders.new")}
      folders={store.spendingFolders}
      captures={store.spendingCaptures}
      expenses={store.expenses}
      categories={store.categories}
      selectedFolderId={mode === "folders" ? folderId ?? null : null}
      selectedCategoryId={selectedCategoryId}
      onClose={() => closeMobileFolders()}
      onNavigate={() => closeMobileFolders()}
      onSelectCategory={selectCategory}
      onCreateFolder={createFolder}
      onRenameFolder={(id) => {
        const folder = store.spendingFolders.find((item) => item.id === id && !item.deletedAt) ?? null;
        closeMobileFolders(() => setRenamingFolder(folder));
      }}
      onDeleteFolder={(id) => {
        closeMobileFolders(() => deleteFolder(id));
      }}
    />}

    {mode !== "capture" && <WorkspaceDock
      query={searchQuery}
      onQueryChange={(value) => {
        setSearchQuery(value);
        router.replace(value ? `/?q=${encodeURIComponent(value)}` : "/", { scroll: false });
      }}
      onCapture={() => onCapture(mode === "folders" ? folderId ?? null : null)}
    />}
    {folderDialogOpen && <FolderNameDialog titleLabel={t("folders.new")} onClose={() => setFolderDialogOpen(false)} onSave={(name) => {
      const id = store.saveSpendingFolder(name, "#D2AE32");
      if (!id) return false;
      setFolderDialogOpen(false);
      router.push(`/folders/${encodeURIComponent(id)}`);
      return true;
    }} />}
    {renamingFolder && <FolderNameDialog key={renamingFolder.id} titleLabel={t("folders.rename")} initialName={renamingFolder.name} onClose={() => setRenamingFolder(null)} onSave={(name) => {
      const normalizedName = name.trim().toLowerCase();
      const duplicate = store.spendingFolders.some((folder) => folder.userId === renamingFolder.userId && folder.id !== renamingFolder.id && !folder.deletedAt && folder.name.trim().toLowerCase() === normalizedName);
      if (duplicate) return false;
      store.renameSpendingFolder(renamingFolder.id, name.trim());
      setRenamingFolder(null);
      return true;
    }} />}
  </div>;
}

function WorkspaceDock({ query, onQueryChange, onCapture }: {
  query: string;
  onQueryChange: (value: string) => void;
  onCapture: () => void;
}) {
  const { t } = useI18n();
  return <div className="workspace-dock">
    <label className="workspace-search-field">
      <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
      <input type="search" aria-label={t("history.search")} placeholder={t("history.search")} value={query} onChange={(event) => onQueryChange(event.target.value)} />
      {query && <button type="button" className="workspace-search-clear" aria-label={t("search.clear")} onClick={() => onQueryChange("")}><X size={18} aria-hidden="true" /></button>}
    </label>
    <button type="button" className="workspace-compose-button" data-dialog-return-focus aria-label={t("capture.open")} title={t("capture.open")} onClick={onCapture}><Pencil className="h-5 w-5" aria-hidden="true" /></button>
  </div>;
}

function MobileFolderDrawer({
  id,
  open,
  title,
  allLabel,
  foldersLabel,
  categoriesLabel,
  createFolderLabel,
  folders,
  captures,
  expenses,
  categories,
  selectedFolderId,
  selectedCategoryId,
  onClose,
  onNavigate,
  onSelectCategory,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  id: string;
  open: boolean;
  title: string;
  allLabel: string;
  foldersLabel: string;
  categoriesLabel: string;
  createFolderLabel: string;
  folders: SpendingFolder[];
  captures: SpendingCapture[];
  expenses: Expense[];
  categories: Category[];
  selectedFolderId: string | null;
  selectedCategoryId: string | null;
  onClose: () => void;
  onNavigate: () => void;
  onSelectCategory: (categoryId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, backdrop, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(<div ref={backdrop} className="mobile-folder-backdrop fixed inset-0 z-50" data-open={open}>
    <button type="button" className="mobile-folder-scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
    <aside id={id} ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open} inert={!open} className="mobile-folder-drawer">
      <button type="button" className="mobile-folder-close icon-button" aria-label={t("common.close")} onClick={onClose}><X className="h-5 w-5" aria-hidden="true" /></button>
      <FolderList
        title={title}
        allLabel={allLabel}
        foldersLabel={foldersLabel}
        categoriesLabel={categoriesLabel}
        createFolderLabel={createFolderLabel}
        folders={folders}
        captures={captures}
        expenses={expenses}
        categories={categories}
        selectedFolderId={selectedFolderId}
        selectedCategoryId={selectedCategoryId}
        onNavigate={onNavigate}
        onSelectCategory={onSelectCategory}
        onCreateFolder={onCreateFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
      />
    </aside>
  </div>, document.body);
}

function FolderNameDialog({ titleLabel, initialName = "", onClose, onSave }: { titleLabel: string; initialName?: string; onClose: () => void; onSave: (name: string) => boolean }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  useDialogFocus(dialog, backdrop, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop fixed inset-0 z-50 flex">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="folder-name-title" className="folder-create-dialog">
      <header className="flex min-h-14 items-center justify-between border-b border-line px-5">
        <button type="button" className="control min-h-11 text-muted" onClick={onClose}>{t("common.cancel")}</button>
        <h2 id="folder-name-title" className="text-base font-semibold text-text">{titleLabel}</h2>
        <button type="submit" form="folder-name-form" className="control min-h-11 font-semibold text-accent">{t("common.save")}</button>
      </header>
      <form id="folder-name-form" className="grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) { setError(t("folders.nameRequired")); return; } if (!onSave(name.trim())) { setError(t("folders.nameError")); return; } }}>
        <label className="grid gap-2 text-sm font-medium text-muted" htmlFor="folder-name">{t("folders.name")}<input id="folder-name" autoFocus className="input min-h-12 !rounded-xl !bg-surface" value={name} maxLength={60} onChange={(event) => { setName(event.target.value); setError(""); }} /></label>
        <p className="text-xs text-muted">{t("folders.nameHint")}</p>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </form>
    </section>
  </div>, document.body);
}

function HomeSummary({ expenses }: { expenses: Expense[] }) {
  const store = useAppStore();
  const { t, language } = useI18n();
  const [visible, setVisible] = useState(true);
  const currency = store.profile?.currency ?? "USD";
  const total = (after: Date) => expenses.filter((expense) => expense.currency === currency && new Date(expense.spentAt) >= after).reduce((sum, expense) => sum + expense.amount, 0);
  return <section className="home-summary" aria-label={t("home.summary")}>
    <h2 className="sr-only">{t("home.summary")}</h2>
    <div className="home-summary-top">
      <div className="home-summary-content">
        <span className="home-summary-month-label">{t("history.thisMonth")}</span>
        <span className="home-summary-month-value">{visible ? formatMoney(total(startOfMonth()), currency, languageLocale(language)) : "••••"}</span>
      </div>
      <button type="button" className="home-summary-visibility" aria-label={visible ? t("home.hideTotal") : t("home.showTotal")} onClick={() => setVisible((value) => !value)}>{visible ? <Eye size={18} /> : <EyeOff size={18} />}</button>
    </div>
    <div className="home-summary-week"><span>{t("home.spentThisWeek")}</span><span className="home-summary-week-value">{visible ? formatMoney(total(startOfWeek()), currency, languageLocale(language)) : "••••"}</span></div>
  </section>;
}

function BudgetPreview() {
  const store = useAppStore();
  const { t, language } = useI18n();
  const currency = store.profile?.currency ?? "USD";
  const status = budgetStatus(store.budgets, store.expenses, currency, monthKey(new Date()));
  if (!status) return null;
  const percentage = Math.max(0, Math.min(100, status.percentage));
  return <section className="grid gap-4" aria-label={t("insights.budget")}>
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <h2 className="section-title min-w-0">{t("insights.budget")}</h2>
      <Link href="/insights" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-strong">{t("home.viewAll")} <ChevronRight className="h-4 w-4" /></Link>
    </div>
    <div className="grid gap-3 py-2">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
        <p className="min-w-0 break-all text-base font-medium tabular-nums">{formatMoney(status.spent, currency, languageLocale(language))}</p>
        <p className="min-w-0 break-words pb-1 text-sm text-muted">{t("insights.spentOf")} {formatMoney(status.budget.amount, currency, languageLocale(language))}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={t("insights.budget")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
        <div className={cx("h-full rounded-full transition-[width] duration-500", status.remaining < 0 ? "bg-danger" : "bg-accent")} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-sm text-muted">{status.remaining >= 0 ? `${t("insights.remaining")}: ${formatMoney(status.remaining, currency, languageLocale(language))}` : t("insights.overBudget").replace("{amount}", formatMoney(Math.abs(status.remaining), currency, languageLocale(language)))}</p>
    </div>
  </section>;
}



function ExpenseSheet({ editId, initialNote, onClose, onSaved = onClose }: { editId?: string; initialNote?: string; onClose: () => void; onSaved?: () => void }) {
  const { t } = useI18n();
  const params = useSearchParams();
  const resolvedEditId = editId ?? params.get("edit") ?? undefined;
  const editing = Boolean(resolvedEditId);
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, backdrop, onClose);
  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop fixed inset-0 z-50 flex">
    <section ref={dialog} tabIndex={-1} className="expense-sheet" role="dialog" aria-modal="true" aria-labelledby="expense-sheet-title">
      <header className="editor-toolbar">
        <button type="button" className="toolbar-action" aria-label={t("expense.close")} onClick={onClose}>{t("common.cancel")}</button>
        <h2 id="expense-sheet-title" className="editor-title">{editing ? t("expense.editTitle") : t("expense.addTitle")}</h2>
        <button type="submit" form="expense-form" className="toolbar-action" aria-label={editing ? t("expense.saveChanges") : t("expense.save")}>{t("common.save")}</button>
      </header>
      <ExpenseForm compact editId={resolvedEditId} initialNote={initialNote} onSaved={onSaved} />
    </section>
  </div>, document.body);
}

function ExpenseForm({ compact = false, editId: explicitEditId, initialNote, onSaved }: { compact?: boolean; editId?: string; initialNote?: string; onSaved?: () => void }) {
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
  const [note, setNote] = useState(editing?.note ?? initialNote ?? "");
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
    <form id="expense-form" noValidate onSubmit={(event) => { event.preventDefault(); save(); }} className={cx("add-expense-panel grid", !compact && "panel")}>
      {!compact && <h2 className="section-title">{editing ? t("expense.editTitle") : t("expense.addTitle")}</h2>}
      <div className="grid gap-2">
        <label className="label" htmlFor="expense-amount">{t("expense.amount")}</label>
        <CurrencyAmountInput locale={languageLocale(language)} id="expense-amount" data-autofocus className="amount-input" value={amount} onValueChange={(value) => { setAmount(value); setError(""); }} />
      </div>
      <div className="grid gap-2">
        <p className="label">{t("expense.category")}</p>
        <div className="category-rail flex gap-2 overflow-x-auto pb-1">
          {store.categories.filter((item) => !item.archivedAt).map((item) => {
            const selected = categoryId === item.id;
            return <button type="button" key={item.id} aria-pressed={selected} className={cx("category-card chip shrink-0", selected && "chip-active")} onClick={() => setCategoryId(item.id)}><CategoryIcon icon={item.icon} size={18} /><span>{categoryLabel(item, t)}</span></button>;
          })}
          <Link href="/manage" className="category-card chip shrink-0 text-accent"><Plus size={18} aria-hidden="true" />{t("expense.addCategory")}</Link>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="label">{t("expense.paymentMethod")}</p>
        <div className="flex flex-wrap gap-2">
          {store.paymentMethods.map((item) => <button type="button" key={item.id} aria-pressed={paymentMethodId === item.id} className={cx("chip", paymentMethodId === item.id && "chip-active")} onClick={() => setPaymentMethodId(item.id)}>{paymentLabel(item.name, t)}</button>)}
        </div>
      </div>
      <div className="form-date-tags">
        <DatePicker value={spentAt} onChange={setSpentAt} />
        <div className="grid gap-2">
          <p className="label">{t("expense.tags")}</p>
          <div className="tag-rail flex gap-2 overflow-x-auto pb-1">
            {store.tags.map((tag) => <button type="button" key={tag.id} aria-pressed={selectedTagIds.includes(tag.id)} className={cx("tag-card chip shrink-0", selectedTagIds.includes(tag.id) && "chip-active")} onClick={() => toggleTag(tag.id)}><span className="max-w-full break-words text-sm">{tag.name}</span></button>)}
            <button type="button" className="add-tag-card tag-card chip shrink-0 text-accent" onClick={() => setAddingTag((current) => !current)}><Plus size={16} aria-hidden="true" /><span className="text-xs font-semibold">{t("expense.addTag")}</span></button>
          </div>
          {addingTag && <div className="tag-creator flex gap-2"><input autoFocus className="input min-h-11" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder={t("expense.newTag")} /><button type="button" className="control min-h-11 bg-accent px-4 text-on-accent" onClick={addTag}>{t("common.add")}</button></div>}
        </div>
      </div>
      <label className="label" htmlFor="expense-note">{t("expense.noteOptional")}<input id="expense-note" className="input mt-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("expense.notePlaceholder")} /></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!compact && <button type="submit" className="control justify-center text-accent">{editing ? t("expense.saveChanges") : t("expense.save")}</button>}
      {editing && <button type="button" className="control justify-center text-danger" onClick={() => { store.deleteExpense(editing.id); onSaved?.(); }}>{t("history.deleteExpense")}</button>}
    </form>
  );
}

function GoalsView() {
  const { t } = useI18n();
  return <section className="grid gap-6"><h2 className="screen-title">{t("nav.goals")}</h2><SavingsGoalsView /></section>;
}

function InsightsView({ onAddExpense, onEditExpense }: { onAddExpense: () => void; onEditExpense: (id: string) => void }) {
  const { t } = useI18n();
  const params = useSearchParams();
  const [mode, setMode] = useState<"overview" | "goals">(() => params.get("tab") === "goals" ? "goals" : "overview");
  useEffect(() => { if (params.get("tab") === "goals") setMode("goals"); }, [params]);
  return <section className="grid gap-6">
    <h2 className="screen-title">{t("nav.insights")}</h2>
    <div className="insights-switch" role="group" aria-label={t("nav.insights")}>
      <button type="button" aria-pressed={mode === "overview"} onClick={() => setMode("overview")}>{t("insights.overview")}</button>
      <button type="button" aria-pressed={mode === "goals"} onClick={() => setMode("goals")}>{t("goals.title")}</button>
    </div>
    {mode === "goals" ? <SavingsGoalsView /> : <CashFlowView onAddExpense={onAddExpense} onEditExpense={onEditExpense} />}
  </section>;
}

function ManageView() {
  const store = useAppStore();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconName>("more-horizontal");
  const [payment, setPayment] = useState("");
  return (
    <div>
      <header className="mb-6"><h2 className="mt-1 screen-title">{t("manage.title")}</h2></header>
      <div className="grid gap-6 xl:grid-cols-2">
      <section className="panel">
        <h2 className="section-title">{t("manage.categories")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("manage.newCategory")} aria-label={t("manage.newCategory")} />
          <button className="control justify-center text-accent" onClick={() => { store.addCategory(name, icon); setName(""); }}>{t("common.add")}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{categoryIconNames.map((item) => <button key={item} aria-label={categoryIconLabel(item, t)} aria-pressed={icon === item} className={cx("icon-button", icon === item && "bg-accent-soft text-accent ")} onClick={() => setIcon(item)}><CategoryIcon icon={item} /></button>)}</div>
        <div className="mt-5 grid gap-2">{store.categories.filter((item) => !item.archivedAt).map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-1"><span className="flex items-center gap-2"><CategoryIcon icon={item.icon} />{categoryLabel(item, t)}</span>{item.kind === "custom" && <button className="icon-button" aria-label={`${t("common.delete")}: ${item.name}`} onClick={() => store.archiveCategory(item.id)}><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
      </section>
      <section className="panel">
        <h2 className="section-title">{t("manage.paymentAndTags")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder={t("manage.newPayment")} aria-label={t("manage.newPayment")} />
          <button className="control justify-center text-accent" onClick={() => { store.ensurePaymentMethods([payment]); setPayment(""); }}>{t("common.add")}</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{store.paymentMethods.map((item) => <span key={item.id} className="chip">{paymentLabel(item.name, t)}</span>)}</div>
        <h3 className="mt-6 font-semibold">{t("manage.reusableTags")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">{store.tags.length ? store.tags.map((tag) => <span key={tag.id} className="chip"><Tags className="h-4 w-4" />{tag.name}</span>) : <p className="text-sm text-muted">{t("manage.tagsEmpty")}</p>}</div>
      </section>
      </div>
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
      <div className="flex items-center justify-between"><div><h2 className="mt-1 screen-title">{t("nav.profile")}</h2></div><Link href="/settings" aria-label={t("nav.settings")} className="icon-button"><Settings className="h-5 w-5" /></Link></div>
      <div className="flex items-center gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-raised text-sm font-semibold text-text">{store.user?.name?.slice(0, 2).toUpperCase() || "W"}</div><div className="min-w-0"><p className="break-words text-base font-semibold">{store.user?.name ?? store.user?.email ?? t("profile.yourWallet")}</p><p className="truncate text-[13px] text-muted">{store.user?.email ?? t("profile.localDemoAccount")}</p><p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-success"><ShieldCheck className="h-3.5 w-3.5" />{providerLabel}</p></div></div>
      <div className="grid grid-cols-1 gap-3 border-y border-line py-4 sm:grid-cols-3"><ProfileStat value={String(active.length)} label={t("profile.expenses")} /><ProfileStat value={formatMoney(monthTotal, store.profile?.currency ?? "USD", languageLocale(language))} label={`${t("profile.thisMonth")} · ${store.profile?.currency ?? "USD"}`} compact /><ProfileStat value={String(loggedDays)} label={t("profile.loggedDays")} /></div>
      <section className="grid gap-4"><h3 className="section-title">{t("profile.basicInfo")}</h3><label className="label" htmlFor="profile-name">{t("profile.name")}<input id="profile-name" className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("profile.namePlaceholder")} /></label><button className="control justify-center text-accent" onClick={() => void store.updateDisplayName(name)}><Pencil className="h-4 w-4" />{t("common.saveChanges")}</button></section>
      <section className="grid gap-2"><h3 className="section-title mb-2">{t("profile.yourWallet")}</h3><ProfileInfo icon={CalendarDays} label={t("profile.memberSince")} detail={store.user?.createdAt ? new Intl.DateTimeFormat(languageLocale(language), { month: "short", year: "numeric" }).format(new Date(store.user.createdAt)) : t("profile.thisDevice")} /><ProfileInfo icon={Cloud} label={t("profile.syncStatus")} detail={!store.cloudEnabled ? t("profile.storedOnDevice") : !store.isOnline ? t("profile.offlineSafe") : t("profile.cloudSyncOn")} /><Link href="/manage" className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-2 text-sm font-medium">{t("manage.title")}<ChevronRight size={18} /></Link><Link href="/settings" className="flex min-h-[60px] items-center gap-3 rounded-xl px-2 transition hover:bg-raised"><span className="grid h-7 w-7 shrink-0 place-items-center text-muted"><Settings className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("profile.preferences")}</span><span className="block text-[13px] text-muted">{t("profile.preferencesDetail")}</span></span><ChevronRight className="h-4 w-4 text-muted" /></Link></section>

    </section>
  );
}

function ProfileStat({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return <div className="grid min-h-16 min-w-0 place-items-center gap-1 text-center"><p className={cx("max-w-full break-words font-semibold tabular-nums", compact ? "text-sm" : "text-xl")}>{value}</p><p className="max-w-full break-words text-xs font-semibold text-muted">{label}</p></div>;
}

function ProfileInfo({ icon: Icon, label, detail }: { icon: typeof CalendarDays; label: string; detail: string }) {
  return <div className="flex min-h-[60px] items-center gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center text-muted"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block break-words text-[13px] text-muted">{detail}</span></span></div>;
}

function SettingsView() {
  const store = useAppStore();
  const { t } = useI18n();
  const [reminders, setReminders] = useState(false);
  const [aiNoticeOpen, setAiNoticeOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const exportEvents = useRef<number[]>([]);
  useEffect(() => { void notificationsEnabled(store.user?.isDemo ? undefined : store.user?.id).then(setReminders); }, [store.user?.id, store.user?.isDemo]);

  async function exportData(type: "json" | "csv" | "markdown" | "pdf") {
    const decision = consumeRollingWindow(exportEvents.current, Date.now(), 5, 60_000);
    exportEvents.current = decision.events;
    if (!decision.allowed) {
      setExportMessage(t("settings.exportRateLimited").replace("{time}", formatShortCountdown(decision.retryAfterSeconds)));
      return;
    }
    setExportMessage(null);
    const snapshot: PersistedAppData = { ...store };
    try {
      if (type === "pdf") {
        await exportSpendingPdf(snapshot);
        return;
      }
      const content = exportNolaData(snapshot, type);
      const mimeType = type === "json" ? "application/json" : type === "csv" ? "text/csv" : "text/markdown";
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nola-export.${type === "markdown" ? "md" : type}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportMessage(t("settings.exportFailed"));
    }
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
    <div>
      <header className="mb-6"><h2 className="mt-1 screen-title">{t("settings.title")}</h2></header>
      <div className="grid gap-6 xl:grid-cols-2">
      <section className="min-w-0">
        <div className="mt-0 grid gap-3">
          <DisplayPreferences />
          <button className="control justify-between border-b border-line !rounded-none !px-0" onClick={async () => { setReminderMessage(null); try { if (reminders) { await setDailyReminderEnabled(false, store.user?.isDemo ? undefined : store.user?.id); setReminders(false); return; } const enabled = await setDailyReminderEnabled(true, store.user?.isDemo ? undefined : store.user?.id); setReminders(enabled); if (!enabled) setReminderMessage(t("settings.reminderUnavailable")); } catch { setReminderMessage(t("settings.reminderUnavailable")); } }}>
            <span className="flex items-center gap-2"><Bell className="h-5 w-5" /> {t("settings.dailyCheckIn")}</span><span>{reminders ? t("settings.on") : t("settings.off")}</span>
          </button>
          <p className="text-xs leading-5 text-muted">{t("settings.reminderHelp")}</p>
          {reminderMessage && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{reminderMessage}</p>}
          <button type="button" className="control min-h-[60px] justify-between border-b border-line !rounded-none !px-0 text-left" aria-pressed={Boolean(store.profile?.aiParsingEnabled)} onClick={() => {
            if (store.profile?.aiParsingEnabled) store.setAiParsingEnabled(false);
            else setAiNoticeOpen(true);
          }}>
            <span className="min-w-0"><span className="block font-medium">{t("settings.aiParsing")}</span><span className="mt-1 block text-xs leading-5 text-muted">{t("settings.aiParsingDetail")}</span></span>
            <span className="shrink-0 pl-3 text-sm font-semibold text-accent">{store.profile?.aiParsingEnabled ? t("settings.on") : t("settings.off")}</span>
          </button>
          {aiNoticeOpen && <AiProcessingNotice open onContinue={() => setAiNoticeOpen(false)} onNotNow={() => setAiNoticeOpen(false)} onSignIn={() => { setAiNoticeOpen(false); void store.signOut(); }} />}
        </div>
      </section>
      <section className="min-w-0">
        <h2 className="section-title">{t("settings.dataAccount")}</h2>
        <div className="mt-5 grid gap-3">
          <button className="control justify-between border-b border-line !rounded-none !px-0" onClick={() => exportData("json")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> {t("settings.exportJsonShort")}</span><ChevronRight className="h-5 w-5" /></button>
          <button className="control justify-between border-b border-line !rounded-none !px-0" onClick={() => exportData("csv")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> {t("settings.exportCsvShort")}</span><ChevronRight className="h-5 w-5" /></button>
          <button className="control justify-between border-b border-line !rounded-none !px-0" onClick={() => exportData("markdown")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> {t("settings.exportMarkdownShort")}</span><ChevronRight className="h-5 w-5" /></button>
          <button className="control justify-between border-b border-line !rounded-none !px-0" onClick={() => void exportData("pdf")}><span className="flex items-center gap-2"><Download className="h-5 w-5" /> {t("settings.exportPdfShort")}</span><ChevronRight className="h-5 w-5" /></button>
          <Link href="/privacy" className="control justify-between border-b border-line !rounded-none !px-0"><span className="flex items-center gap-2"><Shield className="h-5 w-5" /> {t("settings.privacyPolicy")}</span><ChevronRight className="h-5 w-5" /></Link>
          <Link href="/terms" className="control justify-between border-b border-line !rounded-none !px-0">{t("settings.termsService")}<ChevronRight className="h-5 w-5" /></Link>
          <Link href="/cookies" className="control justify-between border-b border-line !rounded-none !px-0">{t("settings.cookiePolicy")}<ChevronRight className="h-5 w-5" /></Link>
          <button className="control justify-between border-b border-line !rounded-none !px-0" onClick={() => void store.signOut()}><span className="flex items-center gap-2"><LogOut className="h-5 w-5" /> {t("settings.signOut")}</span></button>
          <button className="control justify-between border-b border-line !rounded-none !px-0 text-danger" onClick={() => { setDeleteError(null); setDeleteConfirmOpen(true); }}><span className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> {t("settings.deleteAccount")}</span></button>
          {exportMessage && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">{exportMessage}</p>}
        </div>
      </section>
      </div>
      {deleteConfirmOpen && <DeleteAccountDialog deleting={deleting} error={deleteError} onClose={() => setDeleteConfirmOpen(false)} onConfirm={() => void deleteAccount()} />}

    </div>
  );
}



function DeleteAccountDialog({ deleting, error, onClose, onConfirm }: { deleting: boolean; error: string | null; onClose: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const dismiss = () => { if (!deleting) onClose(); };
  useDialogFocus(dialog, backdrop, dismiss);
  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop fixed inset-0 z-50 flex" onClick={dismiss}>
    <section ref={dialog} tabIndex={-1} className="expense-sheet p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 id="delete-account-title" className="section-title">{t("settings.deleteDialogTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("settings.deleteDialogDetail")}</p></div>
        <button type="button" className="icon-button" aria-label={t("common.close")} disabled={deleting} onClick={dismiss}><X size={18} /></button>
      </div>
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button type="button" data-autofocus className="control justify-center bg-raised" disabled={deleting} onClick={dismiss}>{t("common.cancel")}</button>
        <button type="button" className="control justify-center bg-danger text-on-danger" disabled={deleting} onClick={onConfirm}>{deleting ? t("settings.deleting") : t("settings.confirmDeleteAction")}</button>
      </div>
    </section>
  </div>, document.body);
}

function ConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(localStorage.getItem(CONSENT_KEY) !== "true" || localStorage.getItem(COOKIE_CONSENT_KEY) !== "true"), []);
  if (!visible) return null;
  return (
    <div className="consent-notice text-text">
      <p className="text-xs leading-5 sm:text-sm">{t("consent.message")}</p>
      <div className="mt-2 flex gap-2 sm:mt-3">
        <button className="control min-h-11 bg-accent px-4 py-1.5 text-on-accent" onClick={() => { localStorage.setItem(CONSENT_KEY, "true"); localStorage.setItem(COOKIE_CONSENT_KEY, "true"); setVisible(false); }}>{t("common.accept")}</button>
        <Link href="/privacy" className="control min-h-11 bg-raised px-4 py-1.5 text-text">{t("common.review")}</Link>
      </div>
    </div>
  );
}

function InstallPrompt({ visible }: { visible: boolean }) {
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
  if (!event || !visible) return null;
  return <button className="control mx-auto mt-6 flex w-fit text-accent" onClick={() => void (event as Event & { prompt?: () => Promise<void> }).prompt?.()}>{t("install.nola")}</button>;
}
