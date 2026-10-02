import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "expo-router/react-navigation";
import { Stack } from "expo-router/stack";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ConsentBanner } from "@/components/consent-banner";
import { BootScreen } from "@/components/boot-screen";
import { AppStoreProvider, useAppStore } from "@/lib/app-store";
import { reportError } from "@/lib/error-reporting";
import { I18nProvider } from "@/lib/i18n-provider";
import { scheduleNextReminder } from "@/lib/notifications";
import { LedgerThemeProvider, useLedgerTheme } from "@/theme/theme-provider";

function Navigator() {
  const { colors, resolvedMode } = useLedgerTheme();
  const { hydrated, user, profile } = useAppStore();
  const isAuthenticated = hydrated && Boolean(user);
  const hasCompletedOnboarding = isAuthenticated && Boolean(profile?.onboardingCompleted);

  useEffect(() => {
    if (Platform.OS === "web" || !hasCompletedOnboarding) return;
    let active = true;
    async function openFromNotification(response: Notifications.NotificationResponse | null) {
      if (!active || !response) return;
      const data = response.notification.request.content.data as { screen?: unknown };
      if (data.screen !== "/add-expense") return;
      const responseId = response.notification.request.identifier;
      const handledId = await AsyncStorage.getItem("walletly.last-notification-response");
      if (!active || handledId === responseId) return;
      await AsyncStorage.setItem("walletly.last-notification-response", responseId);
      router.push("/add-expense");
      void scheduleNextReminder(false);
    }
    const listener = Notifications.addNotificationResponseReceivedListener((response) => { void openFromNotification(response); });
    void Notifications.getLastNotificationResponseAsync().then((response) => openFromNotification(response));
    return () => { active = false; listener.remove(); };
  }, [hasCompletedOnboarding]);
  const navigationTheme = useMemo(() => ({
    ...(resolvedMode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedMode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
      notification: colors.destructive,
    },
  }), [colors, resolvedMode]);

  if (!hydrated) return <BootScreen />;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: "minimal", contentStyle: { backgroundColor: colors.background }, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="cookies" options={{ headerShown: false }} />
        <Stack.Protected guard={isAuthenticated && !hasCompletedOnboarding}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={hasCompletedOnboarding}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-expense"
            options={{
              headerShown: false,
              presentation: Platform.OS === "web" ? "card" : "modal",
              animation: Platform.OS === "web" ? "none" : "slide_from_bottom",
            }}
          />
          <Stack.Screen name="data-deletion" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <ConsentBanner />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><LedgerThemeProvider><I18nProvider><AppStoreProvider><Navigator /></AppStoreProvider></I18nProvider></LedgerThemeProvider></GestureHandlerRootView>;
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => { reportError(error, { surface: "router" }); }, [error]);
  return <View style={styles.errorScreen}><Text style={styles.errorTitle}>Walletly needs a fresh start</Text><Text style={styles.errorCopy}>Your saved data is still on this device. Try opening this screen again.</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.errorButton}><Text style={styles.errorButtonText}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  errorScreen: { flex: 1, backgroundColor: "#0D0C10", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  errorTitle: { color: "#F7F5FA", fontSize: 24, fontWeight: "700", textAlign: "center" },
  errorCopy: { color: "#A29EAA", fontSize: 16, lineHeight: 22, textAlign: "center", maxWidth: 320 },
  errorButton: { minHeight: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: "#9A9BFF", alignItems: "center", justifyContent: "center", marginTop: 8 },
  errorButtonText: { color: "#17162B", fontSize: 14, fontWeight: "700" },
});
