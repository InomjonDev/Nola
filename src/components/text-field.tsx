import { StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing, typography } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function TextField({ label, error, ...props }: React.ComponentProps<typeof TextInput> & { label?: string; error?: string | null }) {
  const { colors } = useLedgerTheme();
  return (
    <View style={styles.wrap}>
      {label ? <ThemedText variant="caption" muted>{label}</ThemedText> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, typography.body, { color: colors.text, backgroundColor: error ? colors.destructiveSoft : colors.surfaceElevated }]}
        {...props}
      />
      {error ? <ThemedText variant="caption" style={{ color: colors.destructive }}>{error}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.xs }, input: { minHeight: 50, borderRadius: radius.control, borderCurve: "continuous", paddingHorizontal: spacing.md, paddingVertical: spacing.sm } });
