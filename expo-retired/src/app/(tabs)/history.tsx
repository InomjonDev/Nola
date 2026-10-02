import { Search } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { ExpenseRow } from "@/components/expense-row";
import { ThemedText } from "@/components/themed-text";
import { track } from "@/lib/analytics";
import { activeExpenses, isThisMonth, isThisWeek } from "@/lib/format";
import { useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n-provider";
import { radius, spacing, typography } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type DateFilter = "all" | "week" | "month";

export default function HistoryScreen() {
  const { colors } = useLedgerTheme();
  const { t } = useI18n();
  const { user, expenses, categories, deleteExpense, restoreExpense } = useAppStore();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [undoId, setUndoId] = useState<string | null>(null);

  useEffect(() => {
    if (!undoId) return;
    const timer = setTimeout(() => setUndoId(null), 5000);
    return () => clearTimeout(timer);
  }, [undoId]);

  const data = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeExpenses(expenses)
      .filter((item) => categoryId === "all" || item.categoryId === categoryId)
      .filter((item) => dateFilter === "all" || (dateFilter === "week" ? isThisWeek(item.spentAt) : isThisMonth(item.spentAt)))
      .filter((item) => !query || item.note.toLowerCase().includes(query) || categories.find((category) => category.id === item.categoryId)?.name.toLowerCase().includes(query))
      .sort((a, b) => +new Date(b.spentAt) - +new Date(a.spentAt));
  }, [categories, categoryId, dateFilter, expenses, search]);

  const header = (
    <View style={styles.header}>
      <View><ThemedText variant="micro" muted>{t("history.eyebrow")}</ThemedText><ThemedText variant="title">{t("history.title")}</ThemedText></View>
      <View style={[styles.search, { backgroundColor: colors.surfaceElevated }]}>
        <Search size={19} color={colors.textMuted} />
        <TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => user && search.trim() && track("history_searched", user.id, { has_query: true })} placeholder={t("history.search")} placeholderTextColor={colors.textMuted} selectionColor={colors.accent} style={[styles.searchInput, typography.body, { color: colors.text }]} returnKeyType="search" />
      </View>
      <View style={styles.dateFilters}>{(["week", "month", "all"] as DateFilter[]).map((item) => <Chip key={item} label={item === "all" ? t("history.allTime") : item === "week" ? t("history.thisWeek") : t("history.thisMonth")} selected={dateFilter === item} onPress={() => setDateFilter(item)} />)}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilters}>
        <Chip label={t("history.allCategories")} selected={categoryId === "all"} onPress={() => setCategoryId("all")} />
        {categories.filter((item) => !item.archivedAt).map((item) => <Chip key={item.id} label={item.name} selected={categoryId === item.id} onPress={() => setCategoryId(item.id)} />)}
      </ScrollView>
      <ThemedText variant="caption" muted>{data.length} {data.length === 1 ? t("history.expense") : t("history.expenses")}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={styles.emptyContainer}><EmptyState title={t("history.nothingFound")} message={t("history.nothingFoundMessage")} /></View>}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <ExpenseRow expense={item} category={categories.find((category) => category.id === item.categoryId)} onPress={() => router.push({ pathname: "/add-expense", params: { id: item.id } })} onDelete={() => { deleteExpense(item.id); setUndoId(item.id); }} />}
      />
      {undoId ? <View style={[styles.undo, { backgroundColor: colors.surfaceElevated }]}><ThemedText variant="caption">{t("history.deleted")}</ThemedText><Pressable accessibilityRole="button" onPress={() => { restoreExpense(undoId); setUndoId(null); }}><ThemedText variant="label" style={{ color: colors.accent }}>{t("history.undo")}</ThemedText></Pressable></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: 144, flexGrow: 1 },
  header: { paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
  search: { minHeight: 50, borderRadius: radius.control, borderCurve: "continuous", flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, gap: spacing.sm },
  searchInput: { flex: 1, paddingVertical: spacing.sm },
  dateFilters: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  categoryFilters: { gap: spacing.xs },
  undo: { position: "absolute", left: spacing.md, right: spacing.md, bottom: 88, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  emptyContainer: { flex: 1 },
});
