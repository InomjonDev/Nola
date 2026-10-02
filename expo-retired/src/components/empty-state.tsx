import { SearchX } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type EmptyStateProps = {
  title: string;
  message: string;
  compact?: boolean;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, message, compact = false, action }: EmptyStateProps) {
  const { colors } = useLedgerTheme();
  return (
    <View style={[styles.wrap, compact && styles.compact]} accessible={!action} accessibilityLabel={!action ? `${title}. ${message}` : undefined}>
      <SearchX size={compact ? 42 : 58} color={colors.textMuted} strokeWidth={1.25} />
      <ThemedText variant="section">{title}</ThemedText>
      <ThemedText variant="caption" muted style={styles.center}>{message}</ThemedText>
      {action ? <Pressable accessibilityRole="button" onPress={action.onPress} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.58 : 1 }]}><ThemedText variant="label" style={{ color: colors.accent }}>{action.label}</ThemedText></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg }, compact: { minHeight: 118, gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: 0 }, center: { textAlign: "center", maxWidth: 280 }, action: { minHeight: 44, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" } });
