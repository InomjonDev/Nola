import { Bell, ChevronRight, Cloud, Download, FileText, LogOut, Moon, RefreshCw, ShieldAlert, Smartphone, Sun, Trash2, X } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Modal, Platform, Pressable, Share, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { track } from "@/lib/analytics";
import { useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n-provider";
import { notificationsEnabled, scheduleNextReminder, setDailyReminderEnabled } from "@/lib/notifications";
import type { ThemeMode } from "@/lib/types";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export default function SettingsScreen() {
  const { colors, mode, setMode } = useLedgerTheme();
  const { language, setLanguage, t } = useI18n();
  const { user, profile, categories, paymentMethods, tags, expenses, cloudEnabled, isOnline, isSyncing, syncQueue, syncError, retrySync, signOut, deleteAccount } = useAppStore();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const hasLoggedToday = expenses.some((expense) => !expense.deletedAt && new Date(expense.spentAt).toDateString() === new Date().toDateString());
    void notificationsEnabled().then((enabled) => { setReminderEnabled(enabled); if (enabled) void scheduleNextReminder(hasLoggedToday); });
  }, [expenses]);

  async function toggleReminder() {
    setReminderBusy(true);
    const hasLoggedToday = expenses.some((expense) => !expense.deletedAt && new Date(expense.spentAt).toDateString() === new Date().toDateString());
    const next = await setDailyReminderEnabled(!reminderEnabled, hasLoggedToday);
    setReminderEnabled(next); setReminderBusy(false);
  }

  async function exportData(format: "json" | "csv") {
    const activeExpenses = expenses.filter((item) => !item.deletedAt);
    const categoryById = new Map(categories.map((item) => [item.id, item.name]));
    const paymentById = new Map(paymentMethods.map((item) => [item.id, item.name]));
    const content = format === "json"
      ? JSON.stringify({ exportedAt: new Date().toISOString(), profile, categories, paymentMethods, tags, expenses: activeExpenses }, null, 2)
      : [
        ["date", "amount", "currency", "category", "payment_method", "note", "tags"].join(","),
        ...activeExpenses.map((expense) => [
          new Date(expense.spentAt).toISOString(),
          expense.amount,
          expense.currency,
          categoryById.get(expense.categoryId) ?? "",
          paymentById.get(expense.paymentMethodId) ?? "",
          expense.note,
          expense.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name ?? "").filter(Boolean).join(" | "),
        ].map(csvEscape).join(",")),
      ].join("\n");

    try {
      setExportBusy(true);
      setExportError(null);
      if (Platform.OS === "web") {
        await Share.share({ title: `Walletly ${format.toUpperCase()} export`, message: content });
      } else {
        const directory = FileSystem.documentDirectory;
        if (!directory) throw new Error("Export storage is unavailable.");
        const uri = `${directory}walletly-export-${new Date().toISOString().replace(/[:.]/g, "-")}.${format}`;
        await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: `Walletly ${format.toUpperCase()} export`, mimeType: format === "json" ? "application/json" : "text/csv" });
      }
      setExportOpen(false);
      if (user) track("data_exported", user.id, { format, expense_count: activeExpenses.length });
    } catch {
      setExportError(t("settings.exportFailed"));
    } finally {
      setExportBusy(false);
    }
  }

  async function logout() { await signOut(); router.replace("/auth"); }

  async function confirmDelete() {
    try { setDeleting(true); setDeleteError(null); await deleteAccount(); router.replace("/auth"); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : "Please try again."); setDeleting(false); }
  }

  const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [{ value: "system", label: t("settings.system"), icon: Smartphone }, { value: "light", label: t("settings.light"), icon: Sun }, { value: "dark", label: t("settings.dark"), icon: Moon }];

  return (
    <Screen>
      <View style={styles.header}><View><ThemedText variant="micro" muted>{t("settings.eyebrow")}</ThemedText><ThemedText variant="title">{t("settings.title")}</ThemedText></View><IconButton icon={X} label={t("common.close")} onPress={() => router.back()} /></View>

      <View style={styles.section}><ThemedText variant="section">{t("settings.appearance")}</ThemedText><View style={styles.chips}>{modes.map((item) => { const Icon = item.icon; return <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: mode === item.value }} onPress={() => setMode(item.value)} style={[styles.mode, { backgroundColor: mode === item.value ? colors.accentSoft : colors.surface, opacity: mode === item.value ? 1 : 0.78 }]}><Icon size={16} color={mode === item.value ? colors.accent : colors.textMuted} /><ThemedText variant="caption" style={{ color: mode === item.value ? colors.accentStrong : colors.text }}>{item.label}</ThemedText></Pressable>; })}</View></View>

      <View style={styles.section}><ThemedText variant="section">{t("settings.language")}</ThemedText><View style={styles.chips}>{(["en", "ru", "uz"] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: language === item }} onPress={() => setLanguage(item)} style={[styles.language, { backgroundColor: language === item ? colors.accentSoft : colors.surface }]}><ThemedText variant="caption" style={{ color: language === item ? colors.accentStrong : colors.text }}>{item === "en" ? "English" : item === "ru" ? "Русский" : "O'zbekcha"}</ThemedText></Pressable>)}</View></View>

      <View style={styles.section}><ThemedText variant="section">{t("settings.dailyCheckIn")}</ThemedText><Pressable accessibilityRole="switch" accessibilityState={{ checked: reminderEnabled, disabled: reminderBusy }} onPress={() => void toggleReminder()} style={styles.preferenceRow}><View style={[styles.preferenceIcon, { backgroundColor: colors.accentSoft }]}><Bell size={18} color={colors.accent} /></View><View style={styles.grow}><ThemedText variant="label">{t("settings.remind")}</ThemedText><ThemedText variant="caption" muted>{t("settings.remindDetail")}</ThemedText></View><View style={[styles.toggle, { backgroundColor: reminderEnabled ? colors.accent : colors.surfaceElevated }]}><View style={[styles.knob, { backgroundColor: reminderEnabled ? colors.onAccent : colors.textMuted, transform: [{ translateX: reminderEnabled ? 18 : 2 }] }]} /></View></Pressable></View>

      <View style={styles.section}><ThemedText variant="section">{t("settings.workspace")}</ThemedText><LinkRow icon={FileText} label={t("settings.categoriesTags")} detail={t("settings.categoriesTagsDetail")} onPress={() => router.push("/manage")} /><LinkRow icon={Download} label={t("settings.export")} detail={t("settings.exportDetail")} onPress={() => { setExportError(null); setExportOpen(true); }} /></View>

      <View style={styles.section}><ThemedText variant="section">{t("settings.sync")}</ThemedText><View style={styles.preferenceRow}><View style={[styles.preferenceIcon, { backgroundColor: cloudEnabled ? colors.accentSoft : colors.surfaceElevated }]}><Cloud size={19} color={cloudEnabled ? colors.accent : colors.textMuted} /></View><View style={styles.grow}><ThemedText variant="label">{cloudEnabled ? t("settings.cloud") : t("settings.localDemo")}</ThemedText><ThemedText variant="caption" muted>{!isOnline ? t("settings.offline") : isSyncing ? t("settings.syncing") : syncQueue.length ? `${syncQueue.length} changes waiting` : cloudEnabled ? t("settings.upToDate") : t("settings.deviceOnly")}</ThemedText>{syncError ? <ThemedText variant="caption" style={{ color: colors.destructive }}>{syncError}</ThemedText> : null}</View>{syncError ? <Button title={t("settings.retry")} variant="ghost" onPress={retrySync} icon={<RefreshCw size={16} color={colors.text} />} /> : null}</View></View>

      <View style={styles.section}><ThemedText variant="section">{t("settings.privacyLegal")}</ThemedText><LinkRow icon={ShieldAlert} label={t("settings.dataDeletion")} detail={t("settings.dataDeletionDetail")} onPress={() => router.push("/data-deletion")} /><LinkRow icon={ShieldAlert} label={t("settings.privacy")} onPress={() => router.push("/privacy")} /><LinkRow icon={FileText} label={t("settings.terms")} onPress={() => router.push("/terms")} /><LinkRow icon={FileText} label={t("settings.cookies")} onPress={() => router.push("/cookies")} /></View>

      <View style={styles.actions}><Button title={t("settings.signOut")} variant="ghost" onPress={() => void logout()} icon={<LogOut size={18} color={colors.text} />} /><Button title={t("settings.deleteAccount")} variant="destructive" onPress={() => setDeleteOpen(true)} icon={<Trash2 size={18} color={colors.destructive} />} /></View>
      <ThemedText variant="micro" muted style={styles.footer}>WALLETLY MVP / PRIVATE BY DEFAULT</ThemedText>

      <Modal visible={exportOpen} transparent animationType="slide" onRequestClose={() => setExportOpen(false)}><Pressable style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={() => setExportOpen(false)}><Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}><View style={styles.sheetHeader}><View><ThemedText variant="micro" muted>{t("settings.export")}</ThemedText><ThemedText variant="title">{t("settings.exportTitle")}</ThemedText></View><IconButton icon={X} label={t("common.close")} onPress={() => setExportOpen(false)} /></View><ThemedText muted>{t("settings.exportMessage")}</ThemedText>{exportError ? <ThemedText variant="caption" style={{ color: colors.destructive }}>{exportError}</ThemedText> : null}<Button title={t("settings.exportJson")} loading={exportBusy} onPress={() => void exportData("json")} icon={<FileText size={18} color={colors.onAccent} />} /><Button title={t("settings.exportCsv")} variant="secondary" disabled={exportBusy} onPress={() => void exportData("csv")} icon={<Download size={18} color={colors.text} />} /><Button title={t("settings.exportCancel")} variant="ghost" disabled={exportBusy} onPress={() => setExportOpen(false)} /></Pressable></Pressable></Modal>

      <Modal visible={deleteOpen} transparent animationType="slide" onRequestClose={() => setDeleteOpen(false)}><View style={[styles.scrim, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={styles.sheetHeader}><View><ThemedText variant="micro" muted>PERMANENT ACTION</ThemedText><ThemedText variant="title">Delete account?</ThemedText></View><IconButton icon={X} label="Close delete dialog" onPress={() => setDeleteOpen(false)} /></View><ThemedText muted>This removes your cloud account, expenses, categories, and local session. It cannot be undone.</ThemedText>{deleteError ? <ThemedText variant="caption" style={{ color: colors.destructive }}>{deleteError}</ThemedText> : null}<Button title="Delete everything" variant="destructive" loading={deleting} onPress={() => void confirmDelete()} icon={<Trash2 size={18} color={colors.destructive} />} /><Button title="Keep my account" variant="secondary" onPress={() => setDeleteOpen(false)} /></View></View></Modal>
    </Screen>
  );
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function LinkRow({ icon: Icon, label, detail, onPress }: { icon: typeof FileText; label: string; detail?: string; onPress: () => void }) {
  const { colors } = useLedgerTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.linkRow, { borderBottomColor: colors.border, opacity: pressed ? 0.68 : 1 }]}><Icon size={19} color={colors.textMuted} /><View style={styles.grow}><ThemedText variant="label">{label}</ThemedText>{detail ? <ThemedText variant="caption" muted>{detail}</ThemedText> : null}</View><ChevronRight size={17} color={colors.textMuted} /></Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.xs },
  mode: { flex: 1, minHeight: 44, borderRadius: radius.full, paddingHorizontal: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  language: { flex: 1, minHeight: 44, borderRadius: radius.full, paddingHorizontal: spacing.xs, alignItems: "center", justifyContent: "center" },
  preferenceRow: { minHeight: 76, paddingVertical: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preferenceIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, gap: 2 },
  toggle: { width: 42, height: 26, borderRadius: radius.full, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: radius.full },
  linkRow: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actions: { gap: spacing.xs, paddingTop: spacing.sm },
  footer: { textAlign: "center", paddingTop: spacing.xs },
  scrim: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
