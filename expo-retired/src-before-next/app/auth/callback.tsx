import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { ThemedText } from "@/components/themed-text";
import { finishAuthCallback } from "@/lib/supabase";
import { spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export default function AuthCallbackScreen() {
  const { colors } = useLedgerTheme();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [error, setError] = useState<string | null>(null);
  const queryUrl = useMemo(() => {
    const entries: string[][] = Object.entries(params).flatMap(([key, value]) => [[key, Array.isArray(value) ? value[0] : value]]);
    const query = new URLSearchParams(entries);
    return entries.length ? `walletly://auth/callback?${query.toString()}` : null;
  }, [params]);

  useEffect(() => {
    let active = true;
    async function complete() {
      try {
        const initialUrl = await Linking.getInitialURL();
        const session = await finishAuthCallback(queryUrl ?? initialUrl ?? "walletly://auth/callback");
        if (active && session) router.replace("/");
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not complete authentication.");
      }
    }
    void complete();
    return () => { active = false; };
  }, [queryUrl]);

  return <View style={[styles.screen, { backgroundColor: colors.background }]}><ThemedText variant="title">Finishing sign-in</ThemedText>{error ? <><ThemedText variant="caption" style={{ color: colors.destructive }}>{error}</ThemedText><Button title="Back to sign in" onPress={() => router.replace("/auth")} /></> : <ThemedText muted>One moment while Walletly secures your session.</ThemedText>}</View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.sm } });
