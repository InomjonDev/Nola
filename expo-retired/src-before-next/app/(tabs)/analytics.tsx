import { ChartNoAxesColumnIncreasing } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { activeExpenses, expensesInCurrency, formatMoney, isThisMonth, isThisWeek, primaryCurrency } from "@/lib/format";
import { useAppStore } from "@/lib/app-store";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type Period = "week" | "month";

export default function AnalyticsScreen() {
  const { colors } = useLedgerTheme();
  const { profile, categories, expenses } = useAppStore();
  const [period, setPeriod] = useState<Period>("week");
  const [mode, setMode] = useState<"expenses" | "income">("expenses");
  const active = useMemo(() => activeExpenses(expenses), [expenses]);
  const periodActivity = useMemo(() => active.filter((item) => period === "week" ? isThisWeek(item.spentAt) : isThisMonth(item.spentAt)), [active, period]);
  const currency = primaryCurrency(periodActivity, profile?.currency ?? "USD");
  const periodExpenses = useMemo(() => expensesInCurrency(periodActivity, currency), [currency, periodActivity]);
  const total = periodExpenses.reduce((sum, item) => sum + item.amount, 0);
  const bars = useMemo(() => {
    if (period === "week") {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        const mondayOffset = (date.getDay() + 6) % 7;
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - mondayOffset + index);
        return {
          label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date).slice(0, 2),
          periodLabel: new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(date),
          amount: periodExpenses.filter((item) => new Date(item.spentAt).toDateString() === date.toDateString()).reduce((sum, item) => sum + item.amount, 0),
        };
      });
    }
    return Array.from({ length: 5 }, (_, index) => ({
      label: `W${index + 1}`,
      periodLabel: `Week ${index + 1} of this month`,
      amount: periodExpenses.filter((item) => Math.floor((new Date(item.spentAt).getDate() - 1) / 7) === index).reduce((sum, item) => sum + item.amount, 0),
    }));
  }, [period, periodExpenses]);
  const max = Math.max(1, ...bars.map((bar) => bar.amount));
  const categorySummaries = categories
    .filter((category) => !category.archivedAt || periodExpenses.some((expense) => expense.categoryId === category.id))
    .map((category, index) => ({
      category,
      amount: periodExpenses.filter((item) => item.categoryId === category.id).reduce((sum, item) => sum + item.amount, 0),
      color: colors.chart[index % colors.chart.length],
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return <Screen>
    <View style={styles.header}><View><ThemedText variant="micro" muted>YOUR MONEY, IN FOCUS</ThemedText><ThemedText variant="title">Insights</ThemedText></View><ChartNoAxesColumnIncreasing size={24} color={colors.accent} /></View>
    <View style={[styles.segment, { backgroundColor: colors.surfaceElevated }]}><Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "expenses" }} onPress={() => setMode("expenses")} style={[styles.segmentItem, mode === "expenses" && { backgroundColor: colors.surface }]}><ThemedText variant="label">Expenses</ThemedText></Pressable><Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "income" }} onPress={() => setMode("income")} style={[styles.segmentItem, mode === "income" && { backgroundColor: colors.surface }]}><ThemedText variant="label" muted={mode !== "income"}>Income</ThemedText></Pressable></View>
    {mode === "income" ? <EmptyState title="Income is not enabled" message="Walletly is focused on spending for this MVP." /> : <>
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}><View><ThemedText variant="caption" muted>{period === "week" ? "This week" : "This month"} · {currency}</ThemedText><ThemedText variant="amount">{formatMoney(total, currency)}</ThemedText></View><View style={styles.periods}><Chip label="Week" selected={period === "week"} onPress={() => setPeriod("week")} /><Chip label="Month" selected={period === "month"} onPress={() => setPeriod("month")} /></View></View>
        <View style={styles.chart}>
          {bars.map((bar) => (
            <View
              key={bar.label}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${bar.periodLabel}, ${formatMoney(bar.amount, currency)}`}
              style={styles.barItem}
            >
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.chart[0],
                      height: `${Math.max(bar.amount ? 8 : 2, Math.min(100, (bar.amount / max) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText variant="micro" muted>{bar.label}</ThemedText>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText variant="section">Where it went</ThemedText>
          <ThemedText variant="caption" muted>{categorySummaries.length} {categorySummaries.length === 1 ? "category" : "categories"}</ThemedText>
        </View>
        {categorySummaries.length ? (
          <View style={styles.categoryList}>
            {categorySummaries.slice(0, 6).map(({ category, amount, color }) => {
              const share = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <View
                  key={category.id}
                  accessible
                  accessibilityLabel={`${category.name}, ${formatMoney(amount, currency)}, ${share} percent of total`}
                  style={styles.categorySummary}
                >
                  <CategoryIcon name={category.name} icon={category.icon} color={color} size={17} />
                  <View style={styles.categoryCopy}>
                    <ThemedText variant="label">{category.name}</ThemedText>
                    <ThemedText variant="micro" muted>{share}% of total</ThemedText>
                  </View>
                  <ThemedText variant="section" style={styles.tabular}>{formatMoney(amount, currency)}</ThemedText>
                </View>
              );
            })}
          </View>
        ) : <ThemedText variant="caption" muted>Log a few expenses to see your spending shape.</ThemedText>}
      </View>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  segment: { minHeight: 48, borderRadius: radius.full, padding: 4, flexDirection: "row" },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  chartSection: { gap: spacing.lg },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  periods: { flexDirection: "row", gap: spacing.xxs },
  chart: { minHeight: 190, flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  barItem: { flex: 1, alignItems: "center", gap: spacing.xs },
  barTrack: { width: "100%", height: 140, borderRadius: radius.full, justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", borderRadius: radius.full },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryList: { gap: spacing.md },
  categorySummary: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  categoryCopy: { flex: 1, gap: spacing.xxs },
  tabular: { fontVariant: ["tabular-nums"] },
});
