import { Check, CreditCard, WalletCards } from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { DEFAULT_PAYMENT_METHODS, WALLETLY_CURRENCIES } from "@/lib/constants";
import { useAppStore } from "@/lib/app-store";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export default function OnboardingScreen() {
  const { colors } = useLedgerTheme();
  const { completeOnboarding } = useAppStore();
  const [currency, setCurrency] = useState("USD");
  const [payment, setPayment] = useState<string>(DEFAULT_PAYMENT_METHODS[0]);

  function finish() {
    completeOnboarding(currency, payment);
    router.replace("/(tabs)");
  }

  return <Screen contentContainerStyle={styles.screen}>
    <View style={styles.header}><View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><WalletCards size={24} color={colors.accent} /></View><ThemedText variant="micro" muted>FIRST, A FEW DEFAULTS</ThemedText><ThemedText variant="title">Make logging effortless.</ThemedText><ThemedText muted>Pick the currency and payment method Walletly should preselect. You can change both on any expense.</ThemedText></View>
    <View style={styles.section}><ThemedText variant="section">Primary currency</ThemedText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{WALLETLY_CURRENCIES.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: currency === item }} onPress={() => setCurrency(item)} style={[styles.currency, { backgroundColor: currency === item ? colors.accentSoft : colors.surface, borderColor: currency === item ? colors.accent : colors.border }]}><ThemedText variant="label" style={{ color: currency === item ? colors.accentStrong : colors.text }}>{item}</ThemedText>{currency === item ? <Check size={15} color={colors.accent} /> : null}</Pressable>)}</ScrollView></View>
    <View style={styles.section}><ThemedText variant="section">Default payment</ThemedText><View style={styles.paymentList}>{DEFAULT_PAYMENT_METHODS.map((item, index) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: payment === item }} onPress={() => setPayment(item)} style={[styles.payment, { backgroundColor: colors.surface, borderColor: payment === item ? colors.accent : colors.border }]}><View style={[styles.paymentIcon, { backgroundColor: payment === item ? colors.accentSoft : colors.surfaceElevated }]}>{index === 0 ? <CreditCard size={17} color={payment === item ? colors.accent : colors.textMuted} /> : <WalletCards size={17} color={payment === item ? colors.accent : colors.textMuted} />}</View><ThemedText variant="label" style={{ flex: 1 }}>{item}</ThemedText>{payment === item ? <Check size={18} color={colors.accent} /> : null}</Pressable>)}</View></View>
    <Button title="Start tracking" onPress={finish} style={styles.button} />
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingTop: spacing.xxl },
  header: { gap: spacing.sm },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  section: { gap: spacing.md },
  row: { gap: spacing.xs },
  currency: { minHeight: 48, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  paymentList: { gap: spacing.xs },
  payment: { minHeight: 62, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  paymentIcon: { width: 38, height: 38, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  button: { marginTop: "auto" },
});
