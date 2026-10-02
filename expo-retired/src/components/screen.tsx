import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function Screen({ children, scroll = true, contentContainerStyle, ...props }: PropsWithChildren<ScrollViewProps & { scroll?: boolean }>) {
  const { colors } = useLedgerTheme();
  if (!scroll) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><View style={[styles.content, contentContainerStyle]}>{children}</View></SafeAreaView>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, contentContainerStyle]} {...props}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 144, gap: spacing.lg } });
