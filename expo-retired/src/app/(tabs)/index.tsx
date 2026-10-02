import { Bell, ChartNoAxesColumnIncreasing, ChevronRight, Clock3, Plus, SlidersHorizontal } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";

import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { WalletCard } from "@/components/wallet-card";
import { track } from "@/lib/analytics";
import { activeExpenses, expensesInCurrency, formatExpenseDate, formatMoney, isThisMonth, isThisWeek, primaryCurrency } from "@/lib/format";
import { useAppStore } from "@/lib/app-store";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export default function HomeScreen() {
  const { colors } = useLedgerTheme();
  const { height } = useWindowDimensions();
  const { user, profile, categories, expenses, isOnline, syncQueue } = useAppStore();
  const active = useMemo(() => activeExpenses(expenses).sort((a, b) => +new Date(b.spentAt) - +new Date(a.spentAt)), [expenses]);
  const monthActivity = active.filter((item) => isThisMonth(item.spentAt));
  const currency = primaryCurrency(monthActivity, profile?.currency ?? "USD");
  const monthExpenses = expensesInCurrency(monthActivity, currency);
  const total = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const week = expensesInCurrency(active.filter((item) => isThisWeek(item.spentAt)), currency).reduce((sum, item) => sum + item.amount, 0);
  const fullName = user?.name?.trim() || "there";
  const greetingName = fullName === "there" ? fullName : fullName.split(/\s+/)[0];

  useFocusEffect(useCallback(() => { if (user) track("dashboard_viewed", user.id); }, [user]));

  return (
    <Screen contentContainerStyle={height < 760 ? styles.screenCompact : undefined}>
      <View style={styles.header}>
        <View style={styles.greeting}><ProviderAvatar name={fullName} avatarUrl={user?.avatarUrl} size={44} /><View style={styles.greetingCopy}><ThemedText variant="caption" muted>Welcome back,</ThemedText><ThemedText variant="section" numberOfLines={1}>{greetingName}</ThemedText></View></View>
        <View style={styles.headerActions}><View style={[styles.sync, { backgroundColor: colors.surfaceElevated }]}><View style={[styles.dot, { backgroundColor: !isOnline ? colors.warning : syncQueue.length ? colors.accent : colors.success }]} /><ThemedText variant="micro" muted>{!isOnline ? "OFFLINE" : syncQueue.length ? "SYNCING" : "SYNCED"}</ThemedText></View><IconButton icon={Bell} label="Notifications" onPress={() => router.push("/profile")} /></View>
      </View>

      <WalletCard total={total} currency={currency} weekTotal={week} />

      <View style={styles.quickActions}>
        <QuickAction icon={Plus} label="Add" onPress={() => router.push("/add-expense")} accent colors={colors} />
        <QuickAction icon={Clock3} label="Activity" onPress={() => router.push("/(tabs)/history")} colors={colors} />
        <QuickAction icon={ChartNoAxesColumnIncreasing} label="Insights" onPress={() => router.push("/(tabs)/analytics")} colors={colors} />
        <QuickAction icon={SlidersHorizontal} label="Manage" onPress={() => router.push("/manage")} colors={colors} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}><ThemedText variant="section">Recent activity</ThemedText>{active.length ? <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/history")} style={styles.viewAll}><ThemedText variant="caption" style={{ color: colors.accent }}>View all</ThemedText><ChevronRight size={16} color={colors.accent} /></Pressable> : null}</View>
        {active.length ? active.slice(0, 5).map((expense) => { const category = categories.find((item) => item.id === expense.categoryId); return <Pressable key={expense.id} accessibilityRole="button" accessibilityLabel={`Edit ${category?.name ?? "expense"}`} onPress={() => router.push({ pathname: "/add-expense", params: { id: expense.id } })} style={({ pressed }) => [styles.transaction, { borderBottomColor: colors.border, opacity: pressed ? 0.68 : 1 }]}><CategoryIcon name={category?.name ?? "Other"} icon={category?.icon} color={category?.color ?? colors.accent} size={18} /><View style={styles.transactionCopy}><ThemedText variant="label">{category?.name ?? "Other"}</ThemedText><ThemedText variant="caption" muted numberOfLines={1}>{expense.note || formatExpenseDate(expense.spentAt)}</ThemedText></View><View style={styles.transactionAmount}><ThemedText variant="label" style={styles.tabular}>{formatMoney(expense.amount, expense.currency)}</ThemedText><ThemedText variant="micro" muted>{formatExpenseDate(expense.spentAt)}</ThemedText></View></Pressable>; }) : <EmptyState compact title="Your wallet is waiting" message="Add your first expense to start seeing recent spending here." />}
      </View>
    </Screen>
  );
}

function QuickAction({ icon: Icon, label, onPress, accent = false, colors }: { icon: typeof Plus; label: string; onPress: () => void; accent?: boolean; colors: ReturnType<typeof useLedgerTheme>["colors"] }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} pressRetentionOffset={8} style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.72 : 1 }]}>{({ pressed }) => <Animated.View style={[styles.quickActionContent, { transform: [{ scale: pressed ? 0.96 : 1 }], transitionProperty: "transform", transitionDuration: 120 }]}><View style={[styles.quickActionIcon, { backgroundColor: accent ? colors.accent : colors.surfaceElevated }]}><Icon size={20} color={accent ? colors.onAccent : colors.text} strokeWidth={1.9} /></View><ThemedText variant="caption">{label}</ThemedText></Animated.View>}</Pressable>;
}

function getInitials(name: string) {
  if (name === "there") return "W";
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "W";
}

function ProviderAvatar({ name, avatarUrl, size }: { name: string; avatarUrl?: string | null; size: number }) {
  const { colors } = useLedgerTheme();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={showImage ? `${name}'s profile photo` : `${name} profile initials`} style={[styles.avatar, { width: size, height: size, backgroundColor: colors.accentSoft }]}>
      {showImage ? <Image source={{ uri: avatarUrl!, cache: "force-cache" }} resizeMode="cover" onError={() => setFailedAvatarUrl(avatarUrl ?? null)} style={StyleSheet.absoluteFill} /> : <ThemedText variant="label" style={{ color: colors.accent }}>{getInitials(name)}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({ screenCompact: { gap: spacing.md }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.xs }, greeting: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm }, greetingCopy: { flex: 1, minWidth: 0 }, avatar: { borderRadius: radius.full, alignItems: "center", justifyContent: "center", overflow: "hidden" }, headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs }, sync: { minHeight: 30, paddingHorizontal: spacing.sm, borderRadius: radius.full, flexDirection: "row", alignItems: "center", gap: 5 }, dot: { width: 6, height: 6, borderRadius: radius.full }, quickActions: { flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.xxs }, quickAction: { flex: 1, minHeight: 72 }, quickActionContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }, quickActionIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" }, section: { gap: spacing.xs }, sectionHeader: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, viewAll: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2 }, transaction: { minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: spacing.sm }, transactionCopy: { flex: 1, gap: 2 }, transactionAmount: { alignItems: "flex-end", gap: 2 }, tabular: { fontVariant: ["tabular-nums"] } });
