import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { ThemedText } from "@/components/themed-text";
import { COOKIE_CONSENT_KEY } from "@/lib/constants";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function ConsentBanner() {
  const { colors } = useLedgerTheme();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (Platform.OS === "web") AsyncStorage.getItem(COOKIE_CONSENT_KEY).then((value) => setVisible(!value)); }, []);
  if (!visible || pathname === "/auth" || pathname === "/tour") return null;
  const decide = (choice: string) => { void AsyncStorage.setItem(COOKIE_CONSENT_KEY, choice); setVisible(false); };
  return <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}><ThemedText variant="label">Your privacy, your choice</ThemedText><ThemedText variant="caption" muted>Essential storage keeps Walletly working. Optional analytics never include notes or exact amounts.</ThemedText><View style={styles.actions}><Pressable accessibilityRole="link" onPress={() => router.push("/cookies")}><ThemedText variant="caption" style={{ color: colors.accent }}>Cookie policy</ThemedText></Pressable><View style={styles.buttons}><Button title="Decline" variant="ghost" onPress={() => decide("declined")} style={styles.bannerButton} /><Button title="Allow analytics" onPress={() => decide("accepted")} style={styles.bannerButton} /></View></View></View>;
}

const styles = StyleSheet.create({ banner: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, zIndex: 20, borderWidth: 1, borderRadius: radius.control, borderCurve: "continuous", padding: spacing.sm, gap: spacing.xs, boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)" }, actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs }, buttons: { flexDirection: "row", alignItems: "center", gap: 2 }, bannerButton: { minHeight: 40, paddingHorizontal: spacing.sm } });
