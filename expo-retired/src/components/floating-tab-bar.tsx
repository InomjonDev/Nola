import { BlurView } from "expo-blur";
import { ChartNoAxesColumnIncreasing, CirclePlus, History, House, UserRound } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";
import { useI18n } from "@/lib/i18n-provider";

const tabs = [
  { name: "index", label: "Home", icon: House },
  { name: "history", label: "Activity", icon: History },
  { name: "analytics", label: "Insights", icon: ChartNoAxesColumnIncreasing },
  { name: "profile", label: "Profile", icon: UserRound },
] as const;

type Props = { state: { index: number; routes: { name: string; key: string }[] }; navigation: { navigate: (name: string) => void } };

export function FloatingTabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolvedMode } = useLedgerTheme();
  const { t } = useI18n();
  const localizedTabs = tabs.map((tab) => ({ ...tab, label: t(`nav.${tab.name === "index" ? "home" : tab.name === "history" ? "activity" : tab.name === "analytics" ? "insights" : "profile"}` as "nav.home" | "nav.activity" | "nav.insights" | "nav.profile") }));
  const activeRoute = state.routes[state.index]?.name;
  return <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    <View style={styles.row}>
      <BlurView intensity={resolvedMode === "dark" ? 72 : 88} tint={resolvedMode === "dark" ? "dark" : "light"} style={styles.glass}>
        <View style={[styles.glassTint, { backgroundColor: resolvedMode === "dark" ? "rgba(24,23,30,0.78)" : "rgba(255,255,255,0.72)" }]}>{localizedTabs.map((tab) => <TabItem key={tab.name} tab={tab} active={activeRoute === tab.name} onPress={() => navigation.navigate(tab.name)} />)}</View>
      </BlurView>
      <Pressable accessibilityRole="button" accessibilityLabel="Add expense" onPress={() => router.push("/add-expense")} style={({ pressed }) => [styles.add, { backgroundColor: colors.text, opacity: pressed ? 0.78 : 1 }]}><CirclePlus size={24} color={colors.background} strokeWidth={1.9} /></Pressable>
    </View>
  </View>;
}

function TabItem({ tab, active, onPress }: { tab: { name: string; label: string; icon: LucideIcon }; active: boolean; onPress: () => void }) {
  const { colors } = useLedgerTheme();
  const reducedMotion = useReducedMotion();
  const Icon = tab.icon;
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.label} onPress={onPress} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.68 : 1 }]}><Animated.View style={[styles.activePill, { backgroundColor: colors.surface, opacity: active ? 1 : 0, transform: [{ scale: active || reducedMotion ? 1 : 0.9 }], transitionProperty: ["opacity", "transform"], transitionDuration: reducedMotion ? 0 : 180 }]} /><Icon size={20} color={active ? colors.text : colors.textMuted} strokeWidth={active ? 2.3 : 1.75} /><ThemedText variant="micro" style={{ color: active ? colors.text : colors.textMuted }}>{tab.label}</ThemedText></Pressable>;
}

const styles = StyleSheet.create({
  container: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: spacing.md },
  row: { width: "100%", maxWidth: 440, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  glass: { flex: 1, minHeight: 70, borderRadius: radius.full, overflow: "hidden", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.18)" },
  glassTint: { flex: 1, minHeight: 70, borderRadius: radius.full, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xxs },
  item: { flex: 1, minWidth: 0, minHeight: 58, borderRadius: radius.full, alignItems: "center", justifyContent: "center", gap: 3, position: "relative" },
  activePill: { position: "absolute", top: 3, bottom: 3, left: 2, right: 2, borderRadius: radius.full, pointerEvents: "none" },
  add: { width: 56, height: 56, borderRadius: radius.full, alignItems: "center", justifyContent: "center", boxShadow: "0 7px 16px rgba(0, 0, 0, 0.25)" },
});
