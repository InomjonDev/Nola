import { Redirect } from "expo-router";

import { BootScreen } from "@/components/boot-screen";
import { useAppStore } from "@/lib/app-store";

export default function Index() {
  const { hydrated, user, profile } = useAppStore();

  if (!hydrated) return <BootScreen />;
  if (!user) return <Redirect href="/auth" />;
  if (!profile?.onboardingCompleted) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
