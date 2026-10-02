import { Eye, EyeOff, WalletCards } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { formatMoney } from "@/lib/format";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function WalletCard({ total, currency, weekTotal }: { total: number; currency: string; weekTotal: number }) {
  const { colors } = useLedgerTheme();
  const [visible, setVisible] = useState(true);
  return (
    <LinearGradient colors={colors.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card} accessible accessibilityLabel={`Walletly total spent ${visible ? formatMoney(total, currency) : "hidden"}`}>
      <View style={styles.cardTop}>
        <View style={styles.brand}><WalletCards size={19} color={colors.onAccent} /><ThemedText variant="label" style={{ color: colors.onAccent }}>Walletly</ThemedText></View>
        <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide total" : "Show total"} onPress={() => setVisible((current) => !current)} style={styles.eye}>
          {visible ? <Eye size={18} color={colors.onAccent} /> : <EyeOff size={18} color={colors.onAccent} />}
        </Pressable>
      </View>
      <View style={styles.copy}><ThemedText variant="caption" style={{ color: colors.onAccent, opacity: 0.8 }}>Total spent this month · {currency}</ThemedText><ThemedText variant="amount" adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.onAccent }}>{visible ? formatMoney(total, currency) : "••••"}</ThemedText></View>
      <View style={styles.cardBottom}><ThemedText variant="caption" style={{ color: colors.onAccent, opacity: 0.8 }}>This week</ThemedText><ThemedText variant="label" style={{ color: colors.onAccent }}>{visible ? formatMoney(weekTotal, currency) : "••••"}</ThemedText></View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ card: { minHeight: 200, borderRadius: radius.lg, borderCurve: "continuous", padding: spacing.lg, justifyContent: "space-between", overflow: "hidden" }, cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { flexDirection: "row", alignItems: "center", gap: spacing.xs }, eye: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, copy: { gap: spacing.xs }, cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } });
