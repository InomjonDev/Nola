import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import type { User } from "@supabase/supabase-js";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { appStorageKey, DEFAULT_PAYMENT_METHODS, DEMO_SESSION_KEY, GLOBAL_CATEGORIES, legacyAppStorageKey } from "@/lib/constants";
import { createId } from "@/lib/id";
import { reportError } from "@/lib/error-reporting";
import { categoryRow, expenseRow, paymentMethodRow, profileRow, tagRow, toCategory, toExpense, toPaymentMethod, toProfile, toTag } from "@/lib/mappers";
import { flushOperations } from "@/lib/offline-sync";
import { scheduleNextReminder, setDailyReminderEnabled } from "@/lib/notifications";
import { accountStorage, secureStorage } from "@/lib/secure-storage";
import { isSupabaseConfigured, signInWithEmail, signInWithProvider, supabase } from "@/lib/supabase";
import type { Category, CategoryIconName, Expense, ExpenseDraft, PaymentMethod, PersistedAppData, Profile, SyncOperation, Tag, UserIdentity } from "@/lib/types";

function createInitialData(): PersistedAppData {
  return {
    profile: null,
    categories: [...GLOBAL_CATEGORIES],
    paymentMethods: [],
    tags: [],
    expenses: [],
    syncQueue: [],
  };
}

const initialData = createInitialData();

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
const LEGACY_APP_STORAGE_KEY = "walletly.app-data.v1";

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

function ownsRecord(record: { userId: string }, userId: string) {
  return record.userId === userId;
}

function isVisibleCategory(category: Category, userId: string) {
  return (category.kind === "global" && category.userId === null)
    || (category.kind === "custom" && category.userId === userId);
}

function ownsOperation(operation: SyncOperation, userId: string) {
  if (operation.table === "profiles") {
    return operation.recordId === userId && operation.payload?.id === userId;
  }
  return operation.payload?.user_id === userId;
}

function scopeDataToUser(source: Partial<PersistedAppData>, userId: string): PersistedAppData {
  const ownedCategories = (source.categories ?? []).filter((category) => isVisibleCategory(category, userId));
  return {
    profile: source.profile?.userId === userId ? source.profile : null,
    categories: mergeLatest(GLOBAL_CATEGORIES, ownedCategories),
    paymentMethods: (source.paymentMethods ?? []).filter((method) => ownsRecord(method, userId)),
    tags: (source.tags ?? []).filter((tag) => ownsRecord(tag, userId)),
    expenses: (source.expenses ?? []).filter((expense) => ownsRecord(expense, userId)),
    syncQueue: (source.syncQueue ?? []).filter((operation) => ownsOperation(operation, userId)),
  };
}

async function readAccountData(userId: string): Promise<PersistedAppData> {
  const currentKey = appStorageKey(userId);
  const saved = await accountStorage.getItem(currentKey);
  const legacyAccountSaved = saved ? null : await AsyncStorage.getItem(legacyAppStorageKey(userId));
  const stored = saved ?? legacyAccountSaved;
  if (stored) {
    try {
      const migrated = scopeDataToUser(JSON.parse(stored) as PersistedAppData, userId);
      if (legacyAccountSaved) {
        await accountStorage.setItem(currentKey, JSON.stringify(migrated));
        await AsyncStorage.removeItem(legacyAppStorageKey(userId));
      }
      return migrated;
    } catch {
      return createInitialData();
    }
  }

  const legacySaved = await AsyncStorage.getItem(LEGACY_APP_STORAGE_KEY);
  if (!legacySaved) return createInitialData();
  try {
    const migrated = scopeDataToUser(JSON.parse(legacySaved) as PersistedAppData, userId);
    const hasOwnedData = Boolean(
      migrated.profile
      || migrated.categories.some((category) => category.kind === "custom")
      || migrated.paymentMethods.length
      || migrated.tags.length
      || migrated.expenses.length
      || migrated.syncQueue.length,
    );
    if (!hasOwnedData) return createInitialData();
    await accountStorage.setItem(appStorageKey(userId), JSON.stringify(migrated));
    await AsyncStorage.removeItem(LEGACY_APP_STORAGE_KEY);
    return migrated;
  } catch {
    return createInitialData();
  }
}

async function writeAccountData(userId: string, next: PersistedAppData) {
  await accountStorage.setItem(appStorageKey(userId), JSON.stringify(scopeDataToUser(next, userId)));
}

function toUserIdentity(authUser: User): UserIdentity {
  const metadata = authUser.user_metadata as Record<string, unknown> | undefined;
  const provider = typeof authUser.app_metadata?.provider === "string"
    ? authUser.app_metadata.provider
    : authUser.identities?.[0]?.provider ?? null;
  const name = [metadata?.full_name, metadata?.name].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
  const avatarUrl = [metadata?.avatar_url, metadata?.picture].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
  return { id: authUser.id, email: authUser.email ?? null, isDemo: false, name, provider, avatarUrl, createdAt: authUser.created_at ?? null };
}

function demoIdentity(savedSession?: string | null): UserIdentity {
  let name = "Demo wallet";
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession) as { name?: unknown };
      if (typeof parsed.name === "string" && parsed.name.trim()) name = parsed.name.trim().slice(0, 80);
    } catch {
      // Legacy demo sessions stored the literal string "true".
    }
  }
  return { id: "demo-user", email: null, isDemo: true, name, provider: "demo", avatarUrl: null, createdAt: null };
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<PersistedAppData>(initialData);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncLock = useRef(false);
  const syncRunRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(null);
  const dataOwnerIdRef = useRef<string | null>(null);
  const transitionRef = useRef(0);
  const cloudEnabled = isSupabaseConfigured && Boolean(user && !user.isDemo);

  const pullRemote = useCallback(async (userId: string) => {
    if (!supabase || activeUserIdRef.current !== userId) return;
    const [profileResult, categoryResult, paymentResult, tagResult, expenseResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("categories").select("*").or(`kind.eq.global,user_id.eq.${userId}`),
      supabase.from("payment_methods").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId),
      supabase.from("expenses").select("*").eq("user_id", userId),
    ]);
    if (activeUserIdRef.current !== userId) return;
    const firstError = [profileResult, categoryResult, paymentResult, tagResult, expenseResult].find((result) => result.error)?.error;
    if (firstError) {
      setSyncError(firstError.message);
      return;
    }

    setData((current) => {
      if (activeUserIdRef.current !== userId || dataOwnerIdRef.current !== userId) return current;
      const scopedCurrent = scopeDataToUser(current, userId);
      const remoteCategories = (categoryResult.data ?? []).map((row) => toCategory(row)).filter((item) => isVisibleCategory(item, userId));
      const global = remoteCategories.filter((item) => item.kind === "global" && item.userId === null);
      const custom = remoteCategories.filter((item) => item.kind === "custom" && item.userId === userId);
      const remoteProfile = profileResult.data ? toProfile(profileResult.data) : null;
      return {
        ...scopedCurrent,
        profile: remoteProfile?.userId === userId ? remoteProfile : scopedCurrent.profile,
        categories: mergeLatest(
          scopedCurrent.categories,
          [...(global.length ? global : GLOBAL_CATEGORIES), ...custom],
        ),
        paymentMethods: mergeLatest(scopedCurrent.paymentMethods, (paymentResult.data ?? []).map((row) => toPaymentMethod(row)).filter((item) => ownsRecord(item, userId))),
        tags: mergeLatest(scopedCurrent.tags, (tagResult.data ?? []).map((row) => toTag(row)).filter((item) => ownsRecord(item, userId))),
        expenses: mergeLatest(scopedCurrent.expenses, (expenseResult.data ?? []).map((row) => toExpense(row)).filter((item) => ownsRecord(item, userId))),
      };
    });
  }, []);

  const resetActiveAccount = useCallback(() => {
    transitionRef.current += 1;
    syncRunRef.current += 1;
    activeUserIdRef.current = null;
    dataOwnerIdRef.current = null;
    setDataOwnerId(null);
    setUser(null);
    setData(createInitialData());
    setSyncError(null);
    setIsSyncing(false);
    setHydrated(true);
    syncLock.current = false;
  }, []);

  const activateAccount = useCallback(async (identity: UserIdentity, shouldPullRemote = true) => {
    const transition = transitionRef.current + 1;
    transitionRef.current = transition;
    syncRunRef.current += 1;
    syncLock.current = false;
    setIsSyncing(false);
    setHydrated(false);
    activeUserIdRef.current = identity.id;
    dataOwnerIdRef.current = null;
    setDataOwnerId(null);
    setUser(null);
    setData(createInitialData());
    setSyncError(null);

    const local = await readAccountData(identity.id);
    if (transitionRef.current !== transition || activeUserIdRef.current !== identity.id) return;

    setData(local);
    dataOwnerIdRef.current = identity.id;
    setDataOwnerId(identity.id);
    setUser(identity);
    setHydrated(true);
    if (shouldPullRemote && !identity.isDemo) void pullRemote(identity.id);
  }, [pullRemote]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const demo = await secureStorage.getItem(DEMO_SESSION_KEY);

      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;
        const sessionUser = sessionData.session?.user;
        if (sessionUser) {
          await activateAccount(toUserIdentity(sessionUser), false);
          if (cancelled || activeUserIdRef.current !== sessionUser.id) return;
          void pullRemote(sessionUser.id);
          void supabase.auth.getUser().then(({ data: current, error }) => {
            if (!error && current.user?.id === sessionUser.id && activeUserIdRef.current === sessionUser.id) {
              setUser(toUserIdentity(current.user));
            }
          });
        } else if (demo) {
          await activateAccount(demoIdentity(demo), false);
        } else {
          resetActiveAccount();
          setHydrated(true);
        }
      } else if (demo) {
        await activateAccount(demoIdentity(demo), false);
      } else {
        resetActiveAccount();
        setHydrated(true);
      }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [activateAccount, pullRemote, resetActiveAccount]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      const next = session?.user;
      setTimeout(() => {
        if (!next) {
          resetActiveAccount();
          return;
        }
        const identity = toUserIdentity(next);
        if (activeUserIdRef.current === identity.id && dataOwnerIdRef.current === identity.id) {
          setUser(identity);
          if (event === "SIGNED_IN") void pullRemote(identity.id);
          return;
        }
        void activateAccount(identity);
      }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [activateAccount, pullRemote, resetActiveAccount]);

  useEffect(() => NetInfo.addEventListener((state) => setIsOnline(state.isConnected !== false)), []);

  useEffect(() => {
    if (!hydrated || !user || dataOwnerId !== user.id || dataOwnerIdRef.current !== user.id) return;
    void writeAccountData(user.id, data);
  }, [data, dataOwnerId, hydrated, user]);

  const flush = useCallback(async () => {
    const ownerId = user?.id;
    if (!cloudEnabled || !ownerId || dataOwnerId !== ownerId || !isOnline || syncLock.current || data.syncQueue.length === 0) return;
    const syncRun = syncRunRef.current + 1;
    syncRunRef.current = syncRun;
    syncLock.current = true;
    setIsSyncing(true);
    try {
      const result = await flushOperations(data.syncQueue);
      if (activeUserIdRef.current !== ownerId || dataOwnerIdRef.current !== ownerId) return;
      if (result.completedIds.length) {
        const done = new Set(result.completedIds);
        setData((current) => ({ ...current, syncQueue: current.syncQueue.filter((operation) => !done.has(operation.id)) }));
      }
      setSyncError(result.error);
      if (result.error) reportError(new Error(result.error), { surface: "sync" });
    } finally {
      if (syncRunRef.current === syncRun) {
        setIsSyncing(false);
        syncLock.current = false;
      }
    }
  }, [cloudEnabled, data.syncQueue, dataOwnerId, isOnline, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => void flush(), 0);
    return () => clearTimeout(timer);
  }, [flush]);

  const signInSocial = async (provider: "google") => {
    track("auth_started", "anonymous", { provider });
    const session = await signInWithProvider(provider);
    if (session?.user) {
      const next = toUserIdentity(session.user);
      if (activeUserIdRef.current !== next.id || dataOwnerIdRef.current !== next.id) {
        await activateAccount(next);
      } else {
        setUser(next);
      }
      track("signup_completed", next.id, { provider });
      return true;
    }
    return false;
  };

  const signInEmail = async (email: string) => {
    track("auth_started", "anonymous", { provider: "email" });
    await signInWithEmail(email);
    track("auth_magic_link_sent", "anonymous");
  };

  const updateDisplayName = async (name: string) => {
    const clean = name.trim().slice(0, 80);
    if (!user || !clean) return;
    const userId = user.id;
    if (supabase && !user.isDemo) {
      const { data: result, error } = await supabase.auth.updateUser({ data: { full_name: clean } });
      if (error) throw error;
      if (result.user?.id === userId && activeUserIdRef.current === userId) setUser(toUserIdentity(result.user));
      return;
    }
    await secureStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ name: clean }));
    setUser((current) => current?.id === userId ? { ...current, name: clean } : current);
  };

  const signInDemo = async () => {
    const identity = demoIdentity();
    await secureStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ name: identity.name }));
    await activateAccount(identity, false);
  };

  const signOut = async () => {
    const exitingUser = user;
    if (exitingUser && dataOwnerIdRef.current === exitingUser.id) {
      await writeAccountData(exitingUser.id, data);
    }
    await setDailyReminderEnabled(false);
    if (supabase && user && !user.isDemo) await supabase.auth.signOut();
    await secureStorage.removeItem(DEMO_SESSION_KEY);
    resetActiveAccount();
  };

  const completeOnboarding = (currency: string, paymentMethodName: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const payments: PaymentMethod[] = DEFAULT_PAYMENT_METHODS.map((name) => ({ id: createId(), userId: user.id, name, archivedAt: null, updatedAt: now }));
    const payment = payments.find((item) => item.name === paymentMethodName) ?? payments[0];
    const profile: Profile = { userId: user.id, currency, defaultPaymentMethodId: payment.id, onboardingCompleted: true };
    setData((current) => {
      let nextQueue = current.syncQueue;
      for (const method of payments) nextQueue = queue({ ...current, syncQueue: nextQueue }, { table: "payment_methods", action: "upsert", recordId: method.id, payload: paymentMethodRow(method) }, cloudEnabled);
      nextQueue = queue({ ...current, syncQueue: nextQueue }, { table: "profiles", action: "upsert", recordId: user.id, payload: profileRow(profile) }, cloudEnabled);
      return { ...current, profile, paymentMethods: payments, syncQueue: nextQueue };
    });
    track("onboarding_completed", user.id, { currency });
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
    const isEdit = Boolean(id);
    setData((current) => ({
      ...current,
      expenses: isEdit ? current.expenses.map((item) => item.id === id ? expense : item) : [expense, ...current.expenses],
      syncQueue: queue(current, { table: "expenses", action: "upsert", recordId: expense.id, payload: expenseRow(expense) }, cloudEnabled),
    }));
    track(isEdit ? "expense_updated" : "expense_created", user.id, { has_note: Boolean(expense.note), tag_count: expense.tagIds.length });
    const loggedToday = new Date(expense.spentAt).toDateString() === new Date().toDateString();
    void scheduleNextReminder(loggedToday);
    return expense.id;
  };

  const deleteExpense = (id: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    setData((current) => {
      const target = current.expenses.find((item) => item.id === id);
      if (!target) return current;
      const deleted = { ...target, deletedAt: now, updatedAt: now };
      return {
        ...current,
        expenses: current.expenses.map((item) => item.id === id ? deleted : item),
        syncQueue: queue(current, { table: "expenses", action: "upsert", recordId: id, payload: expenseRow(deleted) }, cloudEnabled),
      };
    });
    track("expense_deleted", user.id);
  };

  const restoreExpense = (id: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    setData((current) => {
      const target = current.expenses.find((item) => item.id === id);
      if (!target) return current;
      const restored = { ...target, deletedAt: null, updatedAt: now };
      return { ...current, expenses: current.expenses.map((item) => item.id === id ? restored : item), syncQueue: queue(current, { table: "expenses", action: "upsert", recordId: id, payload: expenseRow(restored) }, cloudEnabled) };
    });
    track("expense_restored", user.id);
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
      track("account_deleted", user.id);
    }
    await setDailyReminderEnabled(false);
    await signOut();
    if (deletedUserId) {
      await accountStorage.removeItem(appStorageKey(deletedUserId));
      await AsyncStorage.removeItem(legacyAppStorageKey(deletedUserId));
    }
  };

  const value: StoreValue = {
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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useAppStore must be used inside AppStoreProvider");
  return value;
}

export { DEFAULT_PAYMENT_METHODS };
