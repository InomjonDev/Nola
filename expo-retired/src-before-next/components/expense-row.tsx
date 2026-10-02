import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Trash2 } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { CategoryIcon } from "@/components/category-icon";
import { formatExpenseDate, formatMoney } from "@/lib/format";
import type { Category, Expense } from "@/lib/types";
import { spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export const ExpenseRow = memo(function ExpenseRow({ expense, category, onPress, onDelete }: { expense: Expense; category?: Category; onPress?: () => void; onDelete?: () => void }) {
  const { colors } = useLedgerTheme();
  const translateX = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.set(Math.min(0, Math.max(-112, event.translationX)));
    })
    .onEnd((event) => {
      const shouldDelete = translateX.get() < -72 || event.velocityX < -850;
      if (shouldDelete && onDelete) {
        translateX.set(withTiming(-112, { duration: 150 }));
        scheduleOnRN(onDelete);
      } else {
        translateX.set(withSpring(0, { duration: 280, dampingRatio: 0.82, velocity: event.velocityX }));
      }
    });
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));
  const content = <>
    <CategoryIcon name={category?.name ?? "Other"} color={category?.color ?? colors.textMuted} size={17} />
    <View style={styles.detail}>
      <ThemedText variant="label" numberOfLines={1}>{category?.name ?? "Uncategorized"}</ThemedText>
      <ThemedText variant="caption" muted numberOfLines={1}>{expense.note || formatExpenseDate(expense.spentAt)}</ThemedText>
    </View>
    <View style={styles.amount}>
      <ThemedText variant="label" style={styles.tabular}>{formatMoney(expense.amount, expense.currency)}</ThemedText>
      {expense.note ? <ThemedText variant="micro" muted>{formatExpenseDate(expense.spentAt)}</ThemedText> : null}
    </View>
  </>;
  return <GestureDetector gesture={pan}><View style={[styles.row, { borderBottomColor: colors.border }]}>
    {onDelete ? <View accessibilityElementsHidden style={[styles.deleteAction, { backgroundColor: colors.destructive }]}><Trash2 size={18} color={colors.onDestructive} /><ThemedText variant="micro" style={{ color: colors.onDestructive }}>Delete</ThemedText></View> : null}
    <Animated.View style={[styles.foreground, { backgroundColor: colors.background }, contentStyle]}>{onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${category?.name ?? "expense"}`} onPress={onPress} style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}>{content}</Pressable> : <View style={styles.main}>{content}</View>}</Animated.View>
  </View></GestureDetector>;
});

const styles = StyleSheet.create({ row: { minHeight: 68, overflow: "hidden", borderBottomWidth: StyleSheet.hairlineWidth }, foreground: { ...StyleSheet.absoluteFill }, deleteAction: { ...StyleSheet.absoluteFill, width: 112, right: 0, left: undefined, alignItems: "center", justifyContent: "center", gap: 2 }, main: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }, detail: { flex: 1, gap: 2 }, amount: { alignItems: "flex-end", gap: 2 }, tabular: { fontVariant: ["tabular-nums"] } });
