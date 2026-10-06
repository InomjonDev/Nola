"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";

import { DEFAULT_PAYMENT_METHODS, DEMO_SESSION_KEY, GLOBAL_CATEGORIES, WALLETLY_CURRENCIES, appStorageKey, legacyAppStorageKey } from "@/lib/constants";
import { createId } from "@/lib/id";
import { accountAdjustmentRow, accountRow, budgetRow, categoryBudgetRow, categoryRow, expenseRow, goalContributionRow, incomeEntryRow, paymentMethodRow, profileRow, recurringRuleRow, savingsGoalRow, tagRow, toAccount, toAccountAdjustment, toBudget, toCategory, toCategoryBudget, toExpense, toGoalContribution, toIncomeEntry, toPaymentMethod, toProfile, toRecurringRule, toSavingsGoal, toTag } from "@/lib/mappers";
import { flushOperations } from "@/lib/offline-sync";
import { clearLocalReminders, setDailyReminderEnabled } from "@/lib/notifications";
import { accountStorage, secureStorage } from "@/lib/secure-storage";
import { isSupabaseConfigured, sendMagicLink as requestMagicLink, signInWithProvider, supabase, supabaseAuthStorageKey } from "@/lib/supabase";
import { calendarDate, normalizeGoalData, validateContribution, validateGoal, type GoalActionResult } from "@/lib/savings-goals";
import { validateCategoryBudget } from "@/lib/category-budgets";
import { materializeDueRecurringRules, validateRecurringRule } from "@/lib/recurring";
import { createDemoData } from "@/lib/demo-data";
import type { Account, AccountAdjustment, AccountAdjustmentDraft, AccountDraft, Budget, BudgetDraft, Category, CategoryBudget, CategoryBudgetDraft, CategoryIconName, Expense, ExpenseDraft, GoalContribution, GoalContributionDraft, IncomeEntry, IncomeEntryDraft, PaymentMethod, PersistedAppData, Profile, RecurringRule, RecurringRuleDraft, SavingsGoal, SavingsGoalDraft, SyncOperation, Tag, UserIdentity } from "@/lib/types";

function createInitialData(): PersistedAppData {
  return { profile: null, categories: [...GLOBAL_CATEGORIES], paymentMethods: [], tags: [], expenses: [], incomeEntries: [], budgets: [], categoryBudgets: [], recurringRules: [], accounts: [], accountAdjustments: [], savingsGoals: [], goalContributions: [], syncQueue: [] };
}

type StoreValue = PersistedAppData & {
  user: UserIdentity | null;
  hydrated: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  cloudEnabled: boolean;
  signInSocial: (provider: "google") => Promise<boolean>;
  sendMagicLink: (email: string) => Promise<string>;
  updateDisplayName: (name: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (currency: string, paymentMethodName: string) => void;
  saveExpense: (draft: ExpenseDraft, id?: string) => string;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => void;
  saveIncome: (draft: IncomeEntryDraft, id?: string) => string;
  deleteIncome: (id: string) => void;
  saveBudget: (draft: BudgetDraft, id?: string) => string;
  deleteBudget: (id: string) => void;
  saveCategoryBudget: (draft: CategoryBudgetDraft, id?: string) => string | undefined;
  deleteCategoryBudget: (id: string) => void;
  saveRecurringRule: (draft: RecurringRuleDraft, id?: string) => string | undefined;
  archiveRecurringRule: (id: string, archived: boolean) => void;
  deleteRecurringRule: (id: string) => void;
  applyDueRecurringRules: () => Promise<void>;
  saveAccount: (draft: AccountDraft) => string | undefined;
  archiveAccount: (id: string, archived: boolean) => void;
  addAccountAdjustment: (draft: AccountAdjustmentDraft) => string | undefined;
  deleteAccountAdjustment: (id: string) => void;
  saveGoal: (draft: SavingsGoalDraft, id?: string) => GoalActionResult;
  archiveGoal: (id: string, archived: boolean) => void;
  deleteGoal: (id: string) => void;
  addGoalContribution: (draft: GoalContributionDraft) => GoalActionResult;
  ensureTags: (names: string[]) => string[];
  ensurePaymentMethods: (names: string[]) => void;
  addCategory: (name: string, icon?: CategoryIconName) => string | undefined;
  renameCategory: (id: string, name: string, icon?: CategoryIconName) => void;
  archiveCategory: (id: string) => void;
  deleteAccount: () => Promise<void>;
  retrySync: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

function queue(data: PersistedAppData, operation: Omit<SyncOperation, "id" | "createdAt">, enabled: boolean) {
  if (!enabled) return data.syncQueue;
  const pending = data.syncQueue.filter((item) => !(item.table === operation.table && item.recordId === operation.recordId));
  return [...pending, { ...operation, id: createId(), createdAt: new Date().toISOString() }];
}

function mergeLatest<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]) {
  const merged = new Map<string, T>();
  for (const item of [...remote, ...local]) {
    const current = merged.get(item.id);
    if (!current || new Date(item.updatedAt) >= new Date(current.updatedAt)) merged.set(item.id, item);
  }
  return [...merged.values()];
}

function isVisibleCategory(category: Category, userId: string) {
  return (category.kind === "global" && category.userId === null) || (category.kind === "custom" && category.userId === userId);
}

function scopeDataToUser(source: Partial<PersistedAppData>, userId: string): PersistedAppData {
  return {
    profile: source.profile?.userId === userId ? source.profile : null,
    categories: mergeLatest(GLOBAL_CATEGORIES, (source.categories ?? []).filter((category) => isVisibleCategory(category, userId))),
    paymentMethods: (source.paymentMethods ?? []).filter((item) => item.userId === userId),
    tags: (source.tags ?? []).filter((item) => item.userId === userId),
    expenses: (source.expenses ?? []).filter((item) => item.userId === userId),
    incomeEntries: (source.incomeEntries ?? []).filter((item) => item.userId === userId).map((item) => ({ ...item, accountId: item.accountId ?? null })),
    budgets: (source.budgets ?? []).filter((item) => item.userId === userId),
    categoryBudgets: (source.categoryBudgets ?? []).filter((item) => item.userId === userId),
    recurringRules: (source.recurringRules ?? []).filter((item) => item.userId === userId),
    accounts: (source.accounts ?? []).filter((item) => item.userId === userId),
    accountAdjustments: (source.accountAdjustments ?? []).filter((item) => item.userId === userId),
    ...normalizeGoalData(source, userId),
    syncQueue: (source.syncQueue ?? []).filter((operation) => operation.recordId === userId || operation.payload?.user_id === userId),
  };
}

async function readAccountData(userId: string) {
  const saved = await accountStorage.getItem(appStorageKey(userId));
  if (!saved) return createInitialData();
  try {
    return scopeDataToUser(JSON.parse(saved) as PersistedAppData, userId);
  } catch {
    return createInitialData();
  }
}

async function writeAccountData(userId: string, next: PersistedAppData) {
  await accountStorage.setItem(appStorageKey(userId), JSON.stringify(scopeDataToUser(next, userId)));
}

function toUserIdentity(authUser: User): UserIdentity {
  const metadata = authUser.user_metadata as Record<string, unknown> | undefined;
  const provider = typeof authUser.app_metadata?.provider === "string" ? authUser.app_metadata.provider : authUser.identities?.[0]?.provider ?? null;
  const name = [metadata?.full_name, metadata?.name].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
  const avatarUrl = [metadata?.avatar_url, metadata?.picture].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
  return { id: authUser.id, email: authUser.email ?? null, isDemo: false, name, provider, avatarUrl, createdAt: authUser.created_at ?? null };
}

function demoIdentity(saved?: string | null): UserIdentity {
  let name = "Demo wallet";
  try {
    const parsed = saved ? JSON.parse(saved) as { name?: unknown } : null;
    if (typeof parsed?.name === "string" && parsed.name.trim()) name = parsed.name.trim().slice(0, 80);
  } catch {
    name = "Demo wallet";
  }
  return { id: "demo-user", email: null, isDemo: true, name, provider: "demo", avatarUrl: null, createdAt: null };
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<PersistedAppData>(createInitialData);
  const currentDataRef = useRef(data);
  currentDataRef.current = data;
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncLock = useRef(false);
  const deleteAccountRequest = useRef<Promise<void> | null>(null);
  const ownerRef = useRef<string | null>(null);
  const goalStateRef = useRef({ savingsGoals: data.savingsGoals, goalContributions: data.goalContributions });
  goalStateRef.current = { savingsGoals: data.savingsGoals, goalContributions: data.goalContributions };
  const recurringOwnerRef = useRef<string | null>(null);
  const recurringInFlightRef = useRef(false);
  const recurringCursorsRef = useRef(new Map<string, string>());
  const cloudEnabled = isSupabaseConfigured && Boolean(user && !user.isDemo);

  const activateAccount = useCallback(async (identity: UserIdentity) => {
    setHydrated(false);
    if (recurringOwnerRef.current !== identity.id) {
      recurringOwnerRef.current = identity.id;
      recurringInFlightRef.current = false;
      recurringCursorsRef.current.clear();
    }
    ownerRef.current = identity.id;
    setUser(identity);
    setData(await readAccountData(identity.id));
    setSyncError(null);
    setHydrated(true);
  }, []);

  const pullRemote = useCallback(async (userId: string) => {
    if (!supabase) return;
    const [profileResult, categoryResult, paymentResult, tagResult, expenseResult, incomeResult, budgetResult, goalResult, contributionResult, categoryBudgetResult, recurringRuleResult, accountResult, accountAdjustmentResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("categories").select("*").or(`kind.eq.global,user_id.eq.${userId}`),
      supabase.from("payment_methods").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId),
      supabase.from("expenses").select("*").eq("user_id", userId),
      supabase.from("income_entries").select("*").eq("user_id", userId),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase.from("savings_goals").select("*").eq("user_id", userId),
      supabase.from("goal_contributions").select("*").eq("user_id", userId),
      supabase.from("category_budgets").select("*").eq("user_id", userId),
      supabase.from("recurring_rules").select("*").eq("user_id", userId),
      supabase.from("accounts").select("*").eq("user_id", userId),
      supabase.from("account_adjustments").select("*").eq("user_id", userId),
    ]);
    if (ownerRef.current !== userId) return;
    const firstError = [profileResult, categoryResult, paymentResult, tagResult, expenseResult, incomeResult, budgetResult].find((result) => result.error)?.error;
    if (firstError) {
      setSyncError(firstError.message);
      return;
    }
    // A pending goals migration must not prevent older Walletly data from loading.
    const addedFeatureError = [goalResult, contributionResult, categoryBudgetResult, recurringRuleResult, accountResult, accountAdjustmentResult].find((result) => result.error)?.error;
    setSyncError(addedFeatureError?.message ?? null);
    setData((current) => ({
      ...current,
      profile: profileResult.data ? toProfile(profileResult.data) : current.profile,
      categories: mergeLatest(current.categories, (categoryResult.data ?? []).map(toCategory).filter((item) => isVisibleCategory(item, userId))),
      paymentMethods: mergeLatest(current.paymentMethods, (paymentResult.data ?? []).map(toPaymentMethod)),
      tags: mergeLatest(current.tags, (tagResult.data ?? []).map(toTag)),
      expenses: mergeLatest(current.expenses, (expenseResult.data ?? []).map(toExpense)),
      incomeEntries: mergeLatest(current.incomeEntries, (incomeResult.data ?? []).map(toIncomeEntry)),
      budgets: mergeLatest(current.budgets, (budgetResult.data ?? []).map(toBudget)),
      categoryBudgets: mergeLatest(current.categoryBudgets, (categoryBudgetResult.data ?? []).map(toCategoryBudget)),
      recurringRules: mergeLatest(current.recurringRules, (recurringRuleResult.data ?? []).map(toRecurringRule)),
      accounts: mergeLatest(current.accounts, (accountResult.data ?? []).map(toAccount)),
      accountAdjustments: mergeLatest(current.accountAdjustments, (accountAdjustmentResult.data ?? []).map(toAccountAdjustment)),
      ...(!goalResult.error && !contributionResult.error ? normalizeGoalData({
        savingsGoals: mergeLatest(current.savingsGoals, (goalResult.data ?? []).map(toSavingsGoal)),
        goalContributions: mergeLatest(current.goalContributions, (contributionResult.data ?? []).map(toGoalContribution)),
      }, userId) : {}),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const demo = await secureStorage.getItem(DEMO_SESSION_KEY);
      if (cancelled) return;
      if (demo) {
        // A local demo session is self-contained and should open without waiting for Supabase.
        await activateAccount(demoIdentity(demo));
        return;
      }
      if (!supabase) {
        setHydrated(true);
        return;
      }
      // Keep the loading shell visible until Supabase has resolved. Rendering auth first causes
      // authenticated users to see a login flash while their existing session is restored.
      const { data: sessionData } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000)),
      ]).catch(() => ({ data: { session: null } }));
      if (cancelled) return;
      if (!sessionData.session?.user) {
        setHydrated(true);
        return;
      }
      const identity = toUserIdentity(sessionData.session.user);
      if (ownerRef.current !== identity.id) await activateAccount(identity);
      if (!cancelled) await pullRemote(identity.id);
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [activateAccount, pullRemote]);

  useEffect(() => {
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        if (_event === "INITIAL_SESSION" || ownerRef.current === "demo-user") {
          setHydrated(true);
          return;
        }
        ownerRef.current = null;
        setUser(null);
        setData(createInitialData());
        return;
      }
      const identity = toUserIdentity(session.user);
      if (ownerRef.current === identity.id) return;
      void activateAccount(identity).then(() => pullRemote(identity.id));
    });
    return () => listener.subscription.unsubscribe();
  }, [activateAccount, pullRemote]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !user || ownerRef.current !== user.id) return;
    void writeAccountData(user.id, data);
  }, [data, hydrated, user]);

  const flush = useCallback(async () => {
    if (!cloudEnabled || !user || !isOnline || syncLock.current || data.syncQueue.length === 0) return;
    syncLock.current = true;
    setIsSyncing(true);
    try {
      const result = await flushOperations(data.syncQueue);
      if (ownerRef.current !== user.id) return;
      if (result.completedIds.length) {
        const done = new Set(result.completedIds);
        setData((current) => ({ ...current, syncQueue: current.syncQueue.filter((item) => !done.has(item.id)) }));
      }
      setSyncError(result.error);
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, [cloudEnabled, data.syncQueue, isOnline, user]);

  useEffect(() => {
    const timer = setTimeout(() => void flush(), 0);
    return () => clearTimeout(timer);
  }, [flush]);

  const signInSocial = async (provider: "google") => {
    await signInWithProvider(provider);
    return false;
  };

  const sendMagicLink = async (email: string) => requestMagicLink(email);

  const applyDueRecurringRules = useCallback(async () => {
    if (!user || ownerRef.current !== user.id || recurringInFlightRef.current) return;
    const today = calendarDate();
    const snapshot = currentDataRef.current;
    const dueRules = snapshot.recurringRules.filter((rule) => !rule.deletedAt && !rule.archivedAt && rule.nextRunDate <= today && recurringCursorsRef.current.get(rule.id) !== rule.nextRunDate);
    if (!dueRules.length) return;

    recurringInFlightRef.current = true;
    for (const rule of dueRules) recurringCursorsRef.current.set(rule.id, rule.nextRunDate);
    try {
      const result = await materializeDueRecurringRules(dueRules, today);
      if (ownerRef.current !== user.id) return;
      const latest = currentDataRef.current;
      const unchangedIds = new Set(dueRules.filter((rule) => {
        const current = latest.recurringRules.find((item) => item.id === rule.id);
        return current && current.userId === user.id && current.updatedAt === rule.updatedAt && current.nextRunDate === rule.nextRunDate && !current.deletedAt && !current.archivedAt;
      }).map((rule) => rule.id));
      for (const rule of dueRules) if (!unchangedIds.has(rule.id)) recurringCursorsRef.current.delete(rule.id);
      const rules = result.rules.filter((rule) => unchangedIds.has(rule.id));
      const transactions = result.transactions.filter((item) => unchangedIds.has(item.ruleId));
      if (!rules.length && !transactions.length) return;

      const createdAt = new Date().toISOString();
      const generatedExpenses = transactions.flatMap((item) => item.expense ? [{
        ...item.expense,
        id: item.id,
        userId: user.id,
        currency: item.expense.currency ?? latest.profile?.currency ?? "USD",
        recurringRuleId: item.ruleId,
        deletedAt: null,
        updatedAt: createdAt,
      } satisfies Expense] : []);
      const generatedIncome = transactions.flatMap((item) => item.income ? [{
        ...item.income,
        id: item.id,
        userId: user.id,
        accountId: item.income.accountId ?? null,
        recurringRuleId: item.ruleId,
        deletedAt: null,
        updatedAt: createdAt,
      } satisfies IncomeEntry] : []);

      setData((current) => {
        const recurringRules = mergeLatest(current.recurringRules, rules);
        const expenses = mergeLatest(current.expenses, generatedExpenses);
        const incomeEntries = mergeLatest(current.incomeEntries, generatedIncome);
        let syncQueue = current.syncQueue;
        for (const rule of rules) syncQueue = queue({ ...current, syncQueue }, { table: "recurring_rules", action: "upsert", recordId: rule.id, payload: recurringRuleRow(rule) }, cloudEnabled);
        for (const expense of generatedExpenses) syncQueue = queue({ ...current, syncQueue }, { table: "expenses", action: "upsert", recordId: expense.id, payload: expenseRow(expense) }, cloudEnabled);
        for (const income of generatedIncome) syncQueue = queue({ ...current, syncQueue }, { table: "income_entries", action: "upsert", recordId: income.id, payload: incomeEntryRow(income) }, cloudEnabled);
        return { ...current, recurringRules, expenses, incomeEntries, syncQueue };
      });
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Recurring entries could not be applied.");
    } finally {
      recurringInFlightRef.current = false;
    }
  }, [cloudEnabled, user]);

  useEffect(() => {
    if (!hydrated || !user || ownerRef.current !== user.id) return;
    const active = data.recurringRules.filter((rule) => !rule.deletedAt && !rule.archivedAt);
    const today = calendarDate();
    if (active.some((rule) => rule.nextRunDate <= today && recurringCursorsRef.current.get(rule.id) !== rule.nextRunDate)) {
      const timer = window.setTimeout(() => void applyDueRecurringRules(), 0);
      return () => window.clearTimeout(timer);
    }
    const nextRunDate = active.map((rule) => rule.nextRunDate).filter((date) => date > today).sort()[0];
    if (!nextRunDate) return;
    const dueAt = new Date(`${nextRunDate}T00:01:00`).getTime();
    const delay = Math.max(1000, Math.min(2_000_000_000, dueAt - Date.now()));
    const timer = window.setTimeout(() => void applyDueRecurringRules(), delay);
    return () => window.clearTimeout(timer);
  }, [applyDueRecurringRules, data.recurringRules, hydrated, user]);

  const updateDisplayName = async (name: string) => {
    const clean = name.trim().slice(0, 80);
    if (!user || !clean) return;
    if (supabase && !user.isDemo) {
      const { data: result, error } = await supabase.auth.updateUser({ data: { full_name: clean } });
      if (error) throw error;
      if (result.user) setUser(toUserIdentity(result.user));
      return;
    }
    await secureStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ name: clean }));
    setUser((current) => current ? { ...current, name: clean } : current);
  };

  const signInDemo = async () => {
    const identity = demoIdentity();
    await secureStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ name: identity.name }));
    await activateAccount(identity);
  };

  const signOut = async () => {
    if (user) await writeAccountData(user.id, data);
    await setDailyReminderEnabled(false, user?.isDemo ? undefined : user?.id);
    if (supabase && user && !user.isDemo) await supabase.auth.signOut();
    await secureStorage.removeItem(DEMO_SESSION_KEY);
    ownerRef.current = null;
    recurringOwnerRef.current = null;
    recurringInFlightRef.current = false;
    recurringCursorsRef.current.clear();
    setUser(null);
    setData(createInitialData());
  };

  const completeOnboarding = (currency: string, paymentMethodName: string) => {
    if (!user) return;
    if (user.isDemo) {
      if (data.expenses.length) return;
      setData(createDemoData(user.id, currency, paymentMethodName));
      return;
    }
    const now = new Date().toISOString();
    const paymentMethods = DEFAULT_PAYMENT_METHODS.map((name) => ({ id: createId(), userId: user.id, name, archivedAt: null, updatedAt: now }));
    const payment = paymentMethods.find((item) => item.name === paymentMethodName) ?? paymentMethods[0];
    const profile: Profile = { userId: user.id, currency, defaultPaymentMethodId: payment.id, onboardingCompleted: true };
    setData((current) => {
      let nextQueue = current.syncQueue;
      for (const method of paymentMethods) nextQueue = queue({ ...current, syncQueue: nextQueue }, { table: "payment_methods", action: "upsert", recordId: method.id, payload: paymentMethodRow(method) }, cloudEnabled);
      nextQueue = queue({ ...current, syncQueue: nextQueue }, { table: "profiles", action: "upsert", recordId: user.id, payload: profileRow(profile) }, cloudEnabled);
      return { ...current, profile, paymentMethods, syncQueue: nextQueue };
    });
  };

  const ensureTags = (names: string[]) => {
    if (!user) return [];
    const clean = [...new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean))];
    const created: Tag[] = [];
    const ids = clean.map((name) => {
      const existing = data.tags.find((tag) => tag.name.toLowerCase() === name);
      if (existing) return existing.id;
      const tag = { id: createId(), userId: user.id, name, updatedAt: new Date().toISOString() };
      created.push(tag);
      return tag.id;
    });
    if (created.length) {
      setData((current) => {
        let nextQueue = current.syncQueue;
        for (const tag of created) nextQueue = queue({ ...current, syncQueue: nextQueue }, { table: "tags", action: "upsert", recordId: tag.id, payload: tagRow(tag) }, cloudEnabled);
        return { ...current, tags: [...current.tags, ...created], syncQueue: nextQueue };
      });
    }
    return ids;
  };

  const ensurePaymentMethods = (names: string[]) => {
    if (!user) return;
    const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    const created = clean.filter((name) => !data.paymentMethods.some((method) => method.name.toLowerCase() === name.toLowerCase())).map((name): PaymentMethod => ({ id: createId(), userId: user.id, name, archivedAt: null, updatedAt: new Date().toISOString() }));
    if (!created.length) return;
    setData((current) => {
      let nextQueue = current.syncQueue;
      for (const method of created) nextQueue = queue({ ...current, syncQueue: nextQueue }, { table: "payment_methods", action: "upsert", recordId: method.id, payload: paymentMethodRow(method) }, cloudEnabled);
      return { ...current, paymentMethods: [...current.paymentMethods, ...created], syncQueue: nextQueue };
    });
  };

  const saveExpense = (draft: ExpenseDraft, id?: string) => {
    if (!user || !data.profile) return "";
    const now = new Date().toISOString();
    const expense: Expense = { ...draft, id: id ?? createId(), userId: user.id, currency: draft.currency ?? data.profile.currency, deletedAt: null, updatedAt: now };
    setData((current) => ({
      ...current,
      expenses: id ? current.expenses.map((item) => item.id === id ? expense : item) : [expense, ...current.expenses],
      syncQueue: queue(current, { table: "expenses", action: "upsert", recordId: expense.id, payload: expenseRow(expense) }, cloudEnabled),
    }));
    return expense.id;
  };

  const deleteExpense = (id: string) => {
    const now = new Date().toISOString();
    setData((current) => {
      const target = current.expenses.find((item) => item.id === id);
      if (!target) return current;
      const deleted = { ...target, deletedAt: now, updatedAt: now };
      return { ...current, expenses: current.expenses.map((item) => item.id === id ? deleted : item), syncQueue: queue(current, { table: "expenses", action: "upsert", recordId: id, payload: expenseRow(deleted) }, cloudEnabled) };
    });
  };

  const restoreExpense = (id: string) => {
    const now = new Date().toISOString();
    setData((current) => {
      const target = current.expenses.find((item) => item.id === id);
      if (!target) return current;
      const restored = { ...target, deletedAt: null, updatedAt: now };
      return { ...current, expenses: current.expenses.map((item) => item.id === id ? restored : item), syncQueue: queue(current, { table: "expenses", action: "upsert", recordId: id, payload: expenseRow(restored) }, cloudEnabled) };
    });
  };

  const saveIncome = (draft: IncomeEntryDraft, id?: string) => {
    if (!user) return "";
    const account = draft.accountId ? data.accounts.find((item) => item.id === draft.accountId && item.userId === user.id && !item.archivedAt && !item.deletedAt && item.currency === draft.currency) : undefined;
    if (draft.accountId && !account) return "";
    const now = new Date().toISOString();
    const income: IncomeEntry = { ...draft, accountId: account?.id ?? null, id: id ?? createId(), userId: user.id, deletedAt: null, updatedAt: now };
    setData((current) => ({
      ...current,
      incomeEntries: id ? current.incomeEntries.map((item) => item.id === id ? income : item) : [income, ...current.incomeEntries],
      syncQueue: queue(current, { table: "income_entries", action: "upsert", recordId: income.id, payload: incomeEntryRow(income) }, cloudEnabled),
    }));
    return income.id;
  };

  const deleteIncome = (id: string) => {
    const now = new Date().toISOString();
    setData((current) => {
      const target = current.incomeEntries.find((item) => item.id === id);
      if (!target) return current;
      const deleted = { ...target, deletedAt: now, updatedAt: now };
      return { ...current, incomeEntries: current.incomeEntries.map((item) => item.id === id ? deleted : item), syncQueue: queue(current, { table: "income_entries", action: "upsert", recordId: id, payload: incomeEntryRow(deleted) }, cloudEnabled) };
    });
  };

  const saveBudget = (draft: BudgetDraft, id?: string) => {
    if (!user) return "";
    const now = new Date().toISOString();
    const existing = !id ? data.budgets.find((item) => !item.deletedAt && item.month === draft.month && item.currency === draft.currency) : undefined;
    const budget: Budget = { ...draft, id: id ?? existing?.id ?? createId(), userId: user.id, deletedAt: null, updatedAt: now };
    setData((current) => ({
      ...current,
      budgets: current.budgets.some((item) => item.id === budget.id) ? current.budgets.map((item) => item.id === budget.id ? budget : item) : [budget, ...current.budgets],
      syncQueue: queue(current, { table: "budgets", action: "upsert", recordId: budget.id, payload: budgetRow(budget) }, cloudEnabled),
    }));
    return budget.id;
  };

  const deleteBudget = (id: string) => {
    const now = new Date().toISOString();
    setData((current) => {
      const target = current.budgets.find((item) => item.id === id);
      if (!target) return current;
      const deleted = { ...target, deletedAt: now, updatedAt: now };
      return { ...current, budgets: current.budgets.map((item) => item.id === id ? deleted : item), syncQueue: queue(current, { table: "budgets", action: "upsert", recordId: id, payload: budgetRow(deleted) }, cloudEnabled) };
    });
  };

  const saveCategoryBudget = (draft: CategoryBudgetDraft, id?: string) => {
    if (!user || validateCategoryBudget(draft, data.categories)) return undefined;
    const existing = data.categoryBudgets.find((item) => !item.deletedAt && item.categoryId === draft.categoryId && item.currency === draft.currency && item.cadence === draft.cadence);
    const budget: CategoryBudget = { ...draft, id: id ?? existing?.id ?? createId(), userId: user.id, deletedAt: null, updatedAt: new Date().toISOString() };
    setData((current) => ({
      ...current,
      categoryBudgets: current.categoryBudgets.some((item) => item.id === budget.id) ? current.categoryBudgets.map((item) => item.id === budget.id ? budget : item) : [budget, ...current.categoryBudgets],
      syncQueue: queue(current, { table: "category_budgets", action: "upsert", recordId: budget.id, payload: categoryBudgetRow(budget) }, cloudEnabled),
    }));
    return budget.id;
  };

  const deleteCategoryBudget = (id: string) => {
    const target = data.categoryBudgets.find((item) => item.id === id && item.userId === user?.id && !item.deletedAt);
    if (!target) return;
    const deleted = { ...target, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, categoryBudgets: current.categoryBudgets.map((item) => item.id === id ? deleted : item), syncQueue: queue(current, { table: "category_budgets", action: "upsert", recordId: id, payload: categoryBudgetRow(deleted) }, cloudEnabled) }));
  };

  const saveRecurringRule = (draft: RecurringRuleDraft, id?: string) => {
    if (!user || validateRecurringRule(draft, data.categories, data.paymentMethods, data.accounts, data.tags)) return undefined;
    const existing = id ? data.recurringRules.find((item) => item.id === id && item.userId === user.id && !item.deletedAt) : undefined;
    if (id && !existing) return undefined;
    const rule: RecurringRule = { ...draft, id: id ?? createId(), userId: user.id, nextRunDate: existing?.nextRunDate ?? draft.startDate, archivedAt: existing?.archivedAt ?? null, deletedAt: null, updatedAt: new Date().toISOString() };
    setData((current) => ({
      ...current,
      recurringRules: current.recurringRules.some((item) => item.id === rule.id) ? current.recurringRules.map((item) => item.id === rule.id ? rule : item) : [rule, ...current.recurringRules],
      syncQueue: queue(current, { table: "recurring_rules", action: "upsert", recordId: rule.id, payload: recurringRuleRow(rule) }, cloudEnabled),
    }));
    return rule.id;
  };

  const deleteRecurringRule = (id: string) => {
    const target = data.recurringRules.find((item) => item.id === id && item.userId === user?.id && !item.deletedAt);
    if (!target) return;
    const deleted = { ...target, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, recurringRules: current.recurringRules.map((item) => item.id === id ? deleted : item), syncQueue: queue(current, { table: "recurring_rules", action: "upsert", recordId: id, payload: recurringRuleRow(deleted) }, cloudEnabled) }));
  };

  const archiveRecurringRule = (id: string, archived: boolean) => {
    const target = data.recurringRules.find((item) => item.id === id && item.userId === user?.id && !item.deletedAt);
    if (!target) return;
    const updated = { ...target, archivedAt: archived ? new Date().toISOString() : null, updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, recurringRules: current.recurringRules.map((item) => item.id === id ? updated : item), syncQueue: queue(current, { table: "recurring_rules", action: "upsert", recordId: id, payload: recurringRuleRow(updated) }, cloudEnabled) }));
  };

  const saveAccount = (draft: AccountDraft) => {
    if (!user || !draft.name.trim() || draft.name.trim().length > 60 || !(WALLETLY_CURRENCIES as readonly string[]).includes(draft.currency) || !["cash", "bank", "card"].includes(draft.kind)) return undefined;
    if (!Number.isFinite(draft.startingBalance) || draft.startingBalance < 0 || draft.startingBalance >= 1e12 || Math.abs(draft.startingBalance * 100 - Math.round(draft.startingBalance * 100)) > 0.0001) return undefined;
    const name = draft.name.trim();
    const linkedMethod = data.paymentMethods.find((method) => method.userId === user.id && !method.archivedAt && method.name.toLocaleLowerCase() === name.toLocaleLowerCase() && !data.accounts.some((account) => account.id === method.id && !account.deletedAt));
    const method: PaymentMethod = linkedMethod ?? { id: createId(), userId: user.id, name, archivedAt: null, updatedAt: new Date().toISOString() };
    const account: Account = { id: method.id, userId: user.id, name, kind: draft.kind, currency: draft.currency, startingBalance: draft.startingBalance, archivedAt: null, deletedAt: null, updatedAt: new Date().toISOString() };
    setData((current) => {
      let syncQueue = current.syncQueue;
      if (!linkedMethod) syncQueue = queue({ ...current, syncQueue }, { table: "payment_methods", action: "upsert", recordId: method.id, payload: paymentMethodRow(method) }, cloudEnabled);
      syncQueue = queue({ ...current, syncQueue }, { table: "accounts", action: "upsert", recordId: account.id, payload: accountRow(account) }, cloudEnabled);
      return {
        ...current,
        paymentMethods: linkedMethod ? current.paymentMethods : [method, ...current.paymentMethods],
        accounts: current.accounts.some((item) => item.id === account.id) ? current.accounts.map((item) => item.id === account.id ? account : item) : [account, ...current.accounts],
        syncQueue,
      };
    });
    return account.id;
  };

  const archiveAccount = (id: string, archived: boolean) => {
    const now = new Date().toISOString();
    setData((current) => {
      const account = current.accounts.find((item) => item.id === id && item.userId === user?.id && !item.deletedAt);
      if (!account) return current;
      const nextAccount = { ...account, archivedAt: archived ? now : null, updatedAt: now };
      const method = current.paymentMethods.find((item) => item.id === id);
      const nextMethod = method ? { ...method, archivedAt: archived ? now : null, updatedAt: now } : null;
      let syncQueue = queue(current, { table: "accounts", action: "upsert", recordId: id, payload: accountRow(nextAccount) }, cloudEnabled);
      if (nextMethod) syncQueue = queue({ ...current, syncQueue }, { table: "payment_methods", action: "upsert", recordId: id, payload: paymentMethodRow(nextMethod) }, cloudEnabled);
      let recurringRules = current.recurringRules;
      if (archived) {
        recurringRules = current.recurringRules.map((rule) => {
          if (rule.accountId !== id || rule.archivedAt || rule.deletedAt) return rule;
          const nextRule = { ...rule, archivedAt: now, updatedAt: now };
          syncQueue = queue({ ...current, syncQueue }, { table: "recurring_rules", action: "upsert", recordId: rule.id, payload: recurringRuleRow(nextRule) }, cloudEnabled);
          return nextRule;
        });
      }
      return {
        ...current,
        accounts: current.accounts.map((item) => item.id === id ? nextAccount : item),
        paymentMethods: nextMethod ? current.paymentMethods.map((item) => item.id === id ? nextMethod : item) : current.paymentMethods,
        recurringRules,
        syncQueue,
      };
    });
  };

  const addAccountAdjustment = (draft: AccountAdjustmentDraft) => {
    if (!user || !draft.amount || !Number.isFinite(draft.amount) || Math.abs(draft.amount) >= 1e12 || Math.abs(draft.amount * 100 - Math.round(draft.amount * 100)) > 0.0001) return undefined;
    const account = data.accounts.find((item) => item.id === draft.accountId && item.userId === user.id && !item.archivedAt && !item.deletedAt && item.currency === draft.currency);
    if (!account || !/^\d{4}-\d{2}-\d{2}$/.test(draft.occurredOn)) return undefined;
    const occurred = new Date(`${draft.occurredOn}T12:00:00.000Z`);
    if (!Number.isFinite(occurred.getTime()) || occurred.toISOString().slice(0, 10) !== draft.occurredOn || draft.note.length > 160) return undefined;
    const adjustment: AccountAdjustment = { ...draft, note: draft.note.trim(), id: createId(), userId: user.id, deletedAt: null, updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, accountAdjustments: [adjustment, ...current.accountAdjustments], syncQueue: queue(current, { table: "account_adjustments", action: "upsert", recordId: adjustment.id, payload: accountAdjustmentRow(adjustment) }, cloudEnabled) }));
    return adjustment.id;
  };

  const deleteAccountAdjustment = (id: string) => {
    const target = data.accountAdjustments.find((item) => item.id === id && item.userId === user?.id && !item.deletedAt);
    if (!target) return;
    const deleted = { ...target, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, accountAdjustments: current.accountAdjustments.map((item) => item.id === id ? deleted : item), syncQueue: queue(current, { table: "account_adjustments", action: "upsert", recordId: id, payload: accountAdjustmentRow(deleted) }, cloudEnabled) }));
  };

  const saveGoal = (draft: SavingsGoalDraft, id?: string): GoalActionResult => {
    if (!user || ownerRef.current !== user.id) return { error: "goals.inactiveError" };
    const current = goalStateRef.current;
    const existing = id ? current.savingsGoals.find((item) => item.id === id && item.userId === user.id) : undefined;
    if (id && !existing) return { error: "goals.inactiveError" };
    const error = validateGoal(draft, existing, current.goalContributions);
    if (error) return { error };
    const goal: SavingsGoal = { ...draft, name: draft.name.trim(), id: id ?? createId(), userId: user.id, archivedAt: existing?.archivedAt ?? null, deletedAt: null, updatedAt: new Date().toISOString() };
    const savingsGoals = existing ? current.savingsGoals.map((item) => item.id === goal.id ? goal : item) : [goal, ...current.savingsGoals];
    goalStateRef.current = { ...current, savingsGoals };
    setData((state) => ({ ...state, savingsGoals, syncQueue: queue(state, { table: "savings_goals", action: "upsert", recordId: goal.id, payload: savingsGoalRow(goal) }, cloudEnabled) }));
    return { id: goal.id, error: null };
  };

  const updateGoalStatus = (id: string, change: Partial<Pick<SavingsGoal, "archivedAt" | "deletedAt">>) => {
    const current = goalStateRef.current;
    const existing = current.savingsGoals.find((item) => item.id === id && item.userId === user?.id && !item.deletedAt);
    if (!existing) return;
    const goal = { ...existing, ...change, updatedAt: new Date().toISOString() };
    const savingsGoals = current.savingsGoals.map((item) => item.id === id ? goal : item);
    goalStateRef.current = { ...current, savingsGoals };
    setData((state) => ({ ...state, savingsGoals, syncQueue: queue(state, { table: "savings_goals", action: "upsert", recordId: id, payload: savingsGoalRow(goal) }, cloudEnabled) }));
  };

  const addGoalContribution = (draft: GoalContributionDraft): GoalActionResult => {
    if (!user || ownerRef.current !== user.id) return { error: "goals.inactiveError" };
    const current = goalStateRef.current;
    const goal = current.savingsGoals.find((item) => item.id === draft.goalId && item.userId === user.id);
    const error = validateContribution(goal, current.goalContributions, { ...draft, currency: goal?.currency ?? "" });
    if (error || !goal) return { error: error ?? "goals.inactiveError" };
    const entry: GoalContribution = { ...draft, note: draft.note.trim(), id: createId(), userId: user.id, currency: goal.currency, deletedAt: null, updatedAt: new Date().toISOString() };
    const goalContributions = [entry, ...current.goalContributions];
    // Update the ledger immediately so two submissions in one render cannot overdraw it.
    goalStateRef.current = { ...current, goalContributions };
    setData((state) => ({ ...state, goalContributions, syncQueue: queue(state, { table: "goal_contributions", action: "upsert", recordId: entry.id, payload: goalContributionRow(entry) }, cloudEnabled) }));
    return { id: entry.id, error: null };
  };

  const addCategory = (name: string, icon?: CategoryIconName) => {
    if (!user || !name.trim()) return undefined;
    const item: Category = { id: createId(), userId: user.id, name: name.trim(), color: "#4F7F6D", icon: icon ?? "more-horizontal", kind: "custom", archivedAt: null, updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, categories: [...current.categories, item], syncQueue: queue(current, { table: "categories", action: "upsert", recordId: item.id, payload: categoryRow(item) }, cloudEnabled) }));
    return item.id;
  };

  const renameCategory = (id: string, name: string, icon?: CategoryIconName) => {
    if (!name.trim()) return;
    setData((current) => {
      const target = current.categories.find((item) => item.id === id && item.kind === "custom");
      if (!target) return current;
      const next = { ...target, name: name.trim(), icon: icon ?? target.icon, updatedAt: new Date().toISOString() };
      return { ...current, categories: current.categories.map((item) => item.id === id ? next : item), syncQueue: queue(current, { table: "categories", action: "upsert", recordId: id, payload: categoryRow(next) }, cloudEnabled) };
    });
  };

  const archiveCategory = (id: string) => {
    setData((current) => {
      const target = current.categories.find((item) => item.id === id && item.kind === "custom");
      if (!target) return current;
      const next = { ...target, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return { ...current, categories: current.categories.map((item) => item.id === id ? next : item), syncQueue: queue(current, { table: "categories", action: "upsert", recordId: id, payload: categoryRow(next) }, cloudEnabled) };
    });
  };

  const deleteAccount = async () => {
    if (deleteAccountRequest.current) return deleteAccountRequest.current;
    const request = (async () => {
      const deletedUserId = user?.id;
      if (supabase && user && !user.isDemo) {
        const { error } = await supabase.rpc("delete_own_account");
        if (error) throw error;
      }
      // Cloud rows are gone. Normal sign-out would write preferences for a deleted user.
      ownerRef.current = null;
      // Do not expose the login screen until this device cannot restore the deleted session.
      await Promise.allSettled([
        secureStorage.removeItem(DEMO_SESSION_KEY),
        ...(deletedUserId ? [accountStorage.removeItem(appStorageKey(deletedUserId)), accountStorage.removeItem(legacyAppStorageKey(deletedUserId))] : []),
        ...(supabaseAuthStorageKey && user && !user.isDemo ? [
          secureStorage.removeItem(supabaseAuthStorageKey),
          secureStorage.removeItem(`${supabaseAuthStorageKey}-user`),
          secureStorage.removeItem(`${supabaseAuthStorageKey}-code-verifier`),
        ] : []),
      ]);
      setUser(null);
      setData(createInitialData());
      setSyncError(null);
      await Promise.allSettled([
        clearLocalReminders(),
        (async () => {
          if (!supabase || !user || user.isDemo) return;
          try {
            await supabase.auth.signOut({ scope: "local" });
          } finally {
            // Deletion already revoked refresh tokens; clear this device even if logout is offline.
            if (supabaseAuthStorageKey) {
              await secureStorage.removeItem(supabaseAuthStorageKey);
              await secureStorage.removeItem(`${supabaseAuthStorageKey}-user`);
              await secureStorage.removeItem(`${supabaseAuthStorageKey}-code-verifier`);
            }
          }
        })(),
      ]);
    })();
    deleteAccountRequest.current = request;
    try {
      await request;
    } finally {
      if (deleteAccountRequest.current === request) deleteAccountRequest.current = null;
    }
  };

  return (
    <StoreContext.Provider value={{
      ...data,
      user,
      hydrated,
      isOnline,
      isSyncing,
      syncError,
      cloudEnabled,
      signInSocial,
      sendMagicLink,
      updateDisplayName,
      signInDemo,
      signOut,
      completeOnboarding,
      saveExpense,
      deleteExpense,
      restoreExpense,
      saveIncome,
      deleteIncome,
      saveBudget,
      deleteBudget,
      saveCategoryBudget,
      deleteCategoryBudget,
      saveRecurringRule,
      archiveRecurringRule,
      deleteRecurringRule,
      applyDueRecurringRules,
      saveAccount,
      archiveAccount,
      addAccountAdjustment,
      deleteAccountAdjustment,
      saveGoal,
      archiveGoal: (id, archived) => updateGoalStatus(id, { archivedAt: archived ? new Date().toISOString() : null }),
      deleteGoal: (id) => updateGoalStatus(id, { deletedAt: new Date().toISOString() }),
      addGoalContribution,
      ensureTags,
      ensurePaymentMethods,
      addCategory,
      renameCategory,
      archiveCategory,
      deleteAccount,
      retrySync: () => void flush(),
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useAppStore must be used inside AppStoreProvider");
  return value;
}

export { DEFAULT_PAYMENT_METHODS };
