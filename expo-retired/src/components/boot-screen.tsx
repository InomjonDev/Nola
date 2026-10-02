import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { useLedgerTheme } from "@/theme/theme-provider";

export function BootScreen() {
  const { colors } = useLedgerTheme();
  const reducedMotion = useReducedMotion();

  return (
    <View style={[styles.root, { backgroundColor: colors.accent }]}>
      <StatusBar style="light" />
      <Animated.View entering={FadeIn.duration(reducedMotion ? 100 : 420)} style={styles.wordmark}>
        <ThemedText variant="display" style={[styles.name, { color: colors.onAccent }]}>Walletly</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  wordmark: { alignItems: "center" },
  name: { letterSpacing: 0 },
});
