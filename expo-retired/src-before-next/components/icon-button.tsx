import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { radius } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function IconButton({ icon: Icon, label, onPress, destructive = false }: { icon: LucideIcon; label: string; onPress: () => void; destructive?: boolean }) {
  const { colors } = useLedgerTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} pressRetentionOffset={8} style={({ pressed }) => [styles.button, { backgroundColor: destructive ? colors.destructiveSoft : colors.surface, opacity: pressed ? 0.78 : 1 }]}>
      {({ pressed }) => <Animated.View style={{ transform: [{ scale: pressed ? 0.92 : 1 }], transitionProperty: "transform", transitionDuration: 120 }}><Icon size={20} strokeWidth={1.8} color={destructive ? colors.destructive : colors.text} /></Animated.View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { width: 46, height: 46, borderRadius: radius.full, borderCurve: "continuous", alignItems: "center", justifyContent: "center", boxShadow: "0 5px 12px rgba(0, 0, 0, 0.07)" } });
