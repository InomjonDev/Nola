import { Pressable, StyleSheet, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { ThemedText } from "@/components/themed-text";
import type { CategoryIconName } from "@/lib/types";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

const OPTIONS: { name: CategoryIconName; label: string }[] = [
  { name: "utensils", label: "Food" },
  { name: "car", label: "Car" },
  { name: "receipt", label: "Bills" },
  { name: "shopping-bag", label: "Shopping" },
  { name: "clapperboard", label: "Fun" },
  { name: "dumbbell", label: "Fitness" },
  { name: "heart-pulse", label: "Health" },
  { name: "home", label: "Home" },
  { name: "plane", label: "Travel" },
  { name: "briefcase", label: "Work" },
  { name: "gift", label: "Gift" },
  { name: "coffee", label: "Coffee" },
  { name: "fuel", label: "Fuel" },
  { name: "ticket", label: "Ticket" },
  { name: "wallet", label: "Wallet" },
  { name: "more-horizontal", label: "Other" },
];

export function CategoryIconPicker({ value, onChange }: { value?: CategoryIconName; onChange: (icon: CategoryIconName) => void }) {
  const { colors } = useLedgerTheme();
  return <View accessibilityLabel="Category icon choices" style={styles.wrap}>{OPTIONS.map((item) => {
    const selected = value === item.name;
    return <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => onChange(item.name)} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}><View style={styles.iconWell}><CategoryIcon name={item.label} icon={item.name} color={selected ? colors.accentStrong : colors.textMuted} size={19} /></View><ThemedText variant="micro" style={{ color: selected ? colors.accentStrong : colors.textMuted }}>{item.label}</ThemedText></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  item: { width: 76, minHeight: 70, alignItems: "center", justifyContent: "center", gap: spacing.xxs, paddingVertical: spacing.xxs },
  iconWell: { width: 38, height: 38, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});
