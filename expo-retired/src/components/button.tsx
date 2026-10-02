import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

export function Button({ title, onPress, variant = "primary", loading = false, disabled = false, icon, style }: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useLedgerTheme();
  const reducedMotion = useReducedMotion();
  const background = variant === "primary" ? colors.text : variant === "destructive" ? colors.destructiveSoft : variant === "secondary" ? colors.surface : "transparent";
  const foreground = variant === "primary" ? colors.background : variant === "destructive" ? colors.destructive : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      pressRetentionOffset={8}
      style={({ pressed }) => [styles.base, { backgroundColor: background, opacity: disabled ? 0.42 : pressed ? 0.78 : 1, boxShadow: variant === "ghost" ? "none" : "0 8px 16px rgba(0, 0, 0, 0.10)" }, style]}
    >
      {({ pressed }) => <Animated.View style={[styles.content, { transform: [{ scale: pressed && !reducedMotion ? 0.975 : 1 }], transitionProperty: "transform", transitionDuration: reducedMotion ? 0 : 120 }]}>{loading ? <ActivityIndicator color={foreground} /> : icon}<ThemedText variant="label" style={{ color: foreground }}>{title}</ThemedText></Animated.View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.full,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
});
