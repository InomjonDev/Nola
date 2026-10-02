import { useState } from "react";
import { StyleSheet } from "react-native";

import { AuthPanel } from "@/components/auth-panel";
import { AuthTour } from "@/components/auth-tour";
import { Screen } from "@/components/screen";
import { spacing } from "@/theme";

type AuthStage = "tour" | "sign-in";

export default function AuthScreen() {
  const [stage, setStage] = useState<AuthStage>("tour");

  function finishTour() {
    setStage("sign-in");
  }

  return (
    <Screen scroll={false} contentContainerStyle={styles.screen}>
      {stage === "tour" ? <AuthTour onComplete={() => void finishTour()} onSkip={() => void finishTour()} /> : <AuthPanel onShowTour={() => setStage("tour")} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 0,
  },
});
