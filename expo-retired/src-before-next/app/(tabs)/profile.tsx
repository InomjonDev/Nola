import { CalendarDays, ChevronRight, Cloud, Pencil, Settings, ShieldCheck, UserRound } from "lucide-react-native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { useAppStore } from "@/lib/app-store";
import { activeExpenses, expensesInCurrency, formatMoney, isThisMonth, primaryCurrency } from "@/lib/format";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export default function ProfileScreen() {
  const { colors } = useLedgerTheme();
  const { user, profile, expenses, cloudEnabled, isOnline, updateDisplayName } = useAppStore();
  const [nameDraft, setNameDraft] = useState<{ userId: string | null; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedForUserId, setSavedForUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useMemo(() => activeExpenses(expenses), [expenses]);
  const monthActivity = active.filter((expense) => isThisMonth(expense.spentAt));
  const monthCurrency = primaryCurrency(monthActivity, profile?.currency ?? "USD");
  const monthTotal = expensesInCurrency(monthActivity, monthCurrency).reduce((total, expense) => total + expense.amount, 0);
  const loggedDays = new Set(active.map((expense) => new Date(expense.spentAt).toDateString())).size;
  const displayName = user?.name?.trim() || "Your wallet";
  const name = nameDraft && nameDraft.userId === user?.id ? nameDraft.value : user?.name ?? "";
  const saved = Boolean(user?.id && savedForUserId === user.id);

  async function saveName() {
    if (!name.trim() || name.trim() === user?.name) return;
    try {
      setSaving(true); setSavedForUserId(null); setError(null);
      await updateDisplayName(name);
      setNameDraft(null);
      setSavedForUserId(user?.id ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your name.");
    } finally { setSaving(false); }
  }

  const providerLabel = user?.isDemo ? "Demo workspace" : user?.provider === "google" ? "Google account" : user?.provider === "email" ? "Email account" : "Connected account";
  const joinedLabel = user?.createdAt ? new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(user.createdAt)) : "This device";

  return (
    <Screen>
      <View style={styles.header}><View><ThemedText variant="micro" muted>ACCOUNT</ThemedText><ThemedText variant="title">Profile</ThemedText></View><IconButton icon={Settings} label="Open settings" onPress={() => router.push("/settings")} /></View>

      <View style={styles.identity}><ProviderAvatar name={displayName} avatarUrl={user?.avatarUrl} /><View style={styles.identityCopy}><ThemedText variant="section">{displayName}</ThemedText><ThemedText variant="caption" muted>{user?.email ?? "Local demo account"}</ThemedText><View style={styles.provider}><ShieldCheck size={13} color={colors.success} /><ThemedText variant="micro" style={{ color: colors.success }}>{providerLabel}</ThemedText></View></View></View>

      <View style={styles.stats}><Stat value={String(active.length)} label="Expenses" /><Stat value={formatMoney(monthTotal, monthCurrency)} label={`This month · ${monthCurrency}`} compact /><Stat value={String(loggedDays)} label="Logged days" /></View>

      <View style={styles.section}><ThemedText variant="section">Basic information</ThemedText><TextField label="Name" value={name} onChangeText={(value) => { setNameDraft({ userId: user?.id ?? null, value }); setSavedForUserId(null); setError(null); }} placeholder="Add your name" autoCapitalize="words" returnKeyType="done" /><Button title={saved ? "Name updated" : "Save changes"} variant="secondary" loading={saving} disabled={!name.trim() || name.trim() === user?.name} onPress={() => void saveName()} icon={<Pencil size={16} color={colors.text} />} />{error ? <ThemedText variant="caption" style={{ color: colors.destructive }}>{error}</ThemedText> : null}</View>

      <View style={styles.section}><ThemedText variant="section">Your Walletly</ThemedText><InfoRow icon={CalendarDays} label="Member since" detail={joinedLabel} /><InfoRow icon={Cloud} label="Sync status" detail={!cloudEnabled ? "Stored on this device" : !isOnline ? "Offline, changes are safe" : "Cloud sync is on"} /><InfoRow icon={UserRound} label="Preferences and privacy" detail="Themes, reminders, data and legal" onPress={() => router.push("/settings")} /></View>
      <ThemedText variant="micro" muted style={styles.footer}>WALLETLY / A QUIETER WAY TO TRACK MONEY</ThemedText>
    </Screen>
  );
}

function Stat({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return <View style={styles.stat}><ThemedText variant={compact ? "label" : "title"} style={styles.tabular} numberOfLines={1} adjustsFontSizeToFit>{value}</ThemedText><ThemedText variant="micro" muted numberOfLines={1}>{label}</ThemedText></View>;
}

function InfoRow({ icon: Icon, label, detail, onPress }: { icon: typeof CalendarDays; label: string; detail: string; onPress?: () => void }) {
  const { colors } = useLedgerTheme();
  const content = <><View style={[styles.infoIcon, { backgroundColor: colors.accentSoft }]}><Icon size={17} color={colors.accent} /></View><View style={styles.grow}><ThemedText variant="label">{label}</ThemedText><ThemedText variant="caption" muted>{detail}</ThemedText></View>{onPress ? <ChevronRight size={17} color={colors.textMuted} /> : null}</>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.infoRow, { opacity: pressed ? 0.68 : 1 }]}>{content}</Pressable> : <View style={styles.infoRow}>{content}</View>;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "W";
}

function ProviderAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { colors } = useLedgerTheme();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={showImage ? `${name}'s profile photo` : `${name} profile initials`} style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
      {showImage ? <Image source={{ uri: avatarUrl!, cache: "force-cache" }} resizeMode="cover" onError={() => setFailedAvatarUrl(avatarUrl ?? null)} style={StyleSheet.absoluteFill} /> : <ThemedText variant="title" style={{ color: colors.accent }}>{getInitials(name)}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  avatar: { width: 68, height: 68, borderRadius: radius.full, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  identityCopy: { flex: 1, gap: 4 },
  provider: { flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 2 },
  stats: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  stat: { flex: 1, minWidth: 0, minHeight: 64, alignItems: "center", justifyContent: "center", gap: 4 },
  tabular: { fontVariant: ["tabular-nums"] },
  section: { gap: spacing.md },
  infoRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, gap: 2 },
  footer: { textAlign: "center", paddingTop: spacing.xs },
});
