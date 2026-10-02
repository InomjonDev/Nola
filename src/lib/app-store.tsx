"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";

import { DEFAULT_PAYMENT_METHODS, DEMO_SESSION_KEY, GLOBAL_CATEGORIES, appStorageKey } from "@/lib/constants";
import { createId } from "@/lib/id";
import { categoryRow, expenseRow, paymentMethodRow, profileRow, tagRow, toCategory, toExpense, toPaymentMethod, toProfile, toTag } from "@/lib/mappers";
import { flushOperations } from "@/lib/offline-sync";
import { scheduleNextReminder, setDailyReminderEnabled } from "@/lib/notifications";
import { accountStorage, secureStorage } from "@/lib/secure-storage";
import { isSupabaseConfigured, signInWithEmail, signInWithProvider, supabase } from "@/lib/supabase";
import type { Category, CategoryIconName, Expense, ExpenseDraft, PaymentMethod, PersistedAppData, Profile, SyncOperation, Tag, UserIdentity } from "@/lib/types";

function createInitialData(): PersistedAppData {
  return { profile: null, categories: [...GLOBAL_CATEGORIES], paymentMethods: [], tags: [], expenses: [], syncQueue: [] };
}

type StoreValue = PersistedAppData & {
  user: UserIdentity | null;
  hydrated: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  cloudEnabled: boolean;
  signInSocial: (provider: "google") => Promise<boolean>;
  signInEmail: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (currency: string, paymentMethodName: string) => void;
  saveExpense: (draft: ExpenseDraft, id?: string) => string;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => void;
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
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncLock = useRef(false);
  const ownerRef = useRef<string | null>(null);
  const cloudEnabled = isSupabaseConfigured && Boolean(user && !user.isDemo);

  const activateAccount = useCallback(async (identity: UserIdentity) => {
    setHydrated(false);
    ownerRef.current = identity.id;
    setUser(identity);
    setData(await readAccountData(identity.id));
    setSyncError(null);
    setHydrated(true);
  }, []);

  const pullRemote = useCallback(async (userId: string) => {
    if (!supabase) return;
    const [profileResult, categoryResult, paymentResult, tagResult, expenseResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("categories").select("*").or(`kind.eq.global,user_id.eq.${userId}`),
      supabase.from("payment_methods").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId),
      supabase.from("expenses").select("*").eq("user_id", userId),
    ]);
    const firstError = [profileResult, categoryResult, paymentResult, tagResult, expenseResult].find((result) => result.error)?.error;
    if (firstError) {
      setSyncError(firstError.message);
      return;
    }
    setData((current) => ({
      ...current,
      profile: profileResult.data ? toProfile(profileResult.data) : current.profile,
      categories: mergeLatest(current.categories, (categoryResult.data ?? []).map(toCategory).filter((item) => isVisibleCategory(item, userId))),
      paymentMethods: mergeLatest(current.paymentMethods, (paymentResult.data ?? []).map(toPaymentMethod)),
      tags: mergeLatest(current.tags, (tagResult.data ?? []).map(toTag)),
      expenses: mergeLatest(current.expenses, (expenseResult.data ?? []).map(toExpense)),
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
        if (_event === "INITIAL_SESSION") {
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

  const signInEmail = async (email: string) => signInWithEmail(email);

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
    await setDailyReminderEnabled(false);
    if (supabase && user && !user.isDemo) await supabase.auth.signOut();
    await secureStorage.removeItem(DEMO_SESSION_KEY);
    ownerRef.current = null;
    setUser(null);
    setData(createInitialData());
  };

  const completeOnboarding = (currency: string, paymentMethodName: string) => {
    if (!user) return;
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
    void scheduleNextReminder(new Date(expense.spentAt).toDateString() === new Date().toDateString());
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
    const deletedUserId = user?.id;
    if (supabase && user && !user.isDemo) {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
    }
    await signOut();
    if (deletedUserId) await accountStorage.removeItem(appStorageKey(deletedUserId));
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
      signInEmail,
      updateDisplayName,
      signInDemo,
      signOut,
      completeOnboarding,
      saveExpense,
      deleteExpense,
      restoreExpense,
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
