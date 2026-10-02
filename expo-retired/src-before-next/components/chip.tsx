import type { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  leading?: ReactNode;
  size?: "compact" | "regular";
  variant?: "filter" | "choice";
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected = false,
  onPress,
  leading,
  size = "regular",
  variant = "filter",
  style,
}: ChipProps) {
  const { colors } = useLedgerTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      pressRetentionOffset={8}
      style={({ pressed }) => [
        styles.chip,
        size === "compact" && styles.compact,
        variant === "choice" && styles.choice,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surfaceElevated,
          opacity: pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {leading}
      <ThemedText variant="caption" style={{ color: selected ? colors.accentStrong : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  choice: {
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
  },
});
