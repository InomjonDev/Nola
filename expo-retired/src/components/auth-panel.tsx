import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight, Check, Sparkles } from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { GoogleLogo } from "@/components/google-logo";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { useAppStore } from "@/lib/app-store";
import { CONSENT_KEY } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { ConsentRecord } from "@/lib/types";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function AuthPanel({ onShowTour }: { onShowTour: () => void }) {
  const { signInSocial, signInEmail } = useAppStore();
  const { colors } = useLedgerTheme();
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canContinue = accepted && ageConfirmed && loading === null;
  const canUseSupabase = isSupabaseConfigured && canContinue;

  async function persistConsent() {
    const consent: ConsentRecord = {
      accepted: true,
      ageConfirmed: true,
      acceptedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  }

  async function signInGoogle() {
    if (!canUseSupabase) return;
    try {
      setLoading("google");
      setError(null);
      setNotice(null);
      const signedIn = await signInSocial("google");
      if (!signedIn) {
        setLoading(null);
        return;
      }
      await persistConsent();
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in. Please try again.");
      setLoading(null);
    }
  }

  async function emailMagicLink() {
    if (!canContinue) return;
    if (!isSupabaseConfigured) {
      setError("Cloud sign-in is not configured yet.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    try {
      setLoading("email");
      setError(null);
      setNotice(null);
      await signInEmail(email.trim().toLowerCase());
      await persistConsent();
      setNotice("Check your inbox for a secure Walletly sign-in link.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the sign-in link. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <ThemedText variant="label" style={{ color: colors.accent }}>Walletly</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take the Walletly tour"
          onPress={onShowTour}
          hitSlop={10}
          style={({ pressed }) => [styles.tourButton, { opacity: pressed ? 0.55 : 1 }]}
        >
          <Sparkles size={16} color={colors.accent} />
          <ThemedText variant="label" style={{ color: colors.accent }}>Tour</ThemedText>
        </Pressable>
      </View>

      <View style={styles.main}>
        <View style={styles.intro}>
          <ThemedText variant="title" style={styles.introTitle}>Spend with intention.</ThemedText>
          <ThemedText muted style={styles.introCopy}>A calm, private place to notice your spending and make the next choice clearer.</ThemedText>
        </View>

        <View style={styles.form}>
          <TextField
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearFeedback();
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void emailMagicLink()}
            style={styles.emailInput}
          />

          <Button
            title="Continue"
            icon={<ArrowRight size={18} color={colors.background} />}
            loading={loading === "email"}
            disabled={!canContinue || !email.trim() || !isSupabaseConfigured}
            onPress={() => void emailMagicLink()}
          />

          {notice ? <ThemedText accessibilityLiveRegion="polite" variant="caption" style={{ color: colors.success }}>{notice}</ThemedText> : null}
          {error ? <ThemedText accessibilityLiveRegion="polite" variant="caption" style={{ color: colors.destructive }}>{error}</ThemedText> : null}
          {!isSupabaseConfigured ? <ThemedText variant="micro" muted style={styles.envNote}>Cloud sign-in is not configured yet.</ThemedText> : null}

          <Button
            title="Continue with Google"
            variant="secondary"
            icon={<GoogleLogo size={19} />}
            loading={loading === "google"}
            disabled={!canUseSupabase}
            onPress={() => void signInGoogle()}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.consents}>
          <ConsentRow checked={accepted} onPress={() => setAccepted((value) => !value)}>
            <ThemedText variant="micro" muted>
              I agree to the <LegalLink title="Terms" href="/terms" />, <LegalLink title="Privacy" href="/privacy" />, and <LegalLink title="Cookies" href="/cookies" />.
            </ThemedText>
          </ConsentRow>
          <ConsentRow checked={ageConfirmed} onPress={() => setAgeConfirmed((value) => !value)}>
            <ThemedText variant="micro" muted>I confirm I am old enough to use Walletly and will not submit a child&apos;s data.</ThemedText>
          </ConsentRow>
        </View>
        <ThemedText variant="micro" muted style={styles.footerNote}>By continuing, you keep control of your data.</ThemedText>
      </View>
    </KeyboardAvoidingView>
  );
}

function LegalLink({ title, href }: { title: string; href: "/terms" | "/privacy" | "/cookies" }) {
  const { colors } = useLedgerTheme();
  return (
    <ThemedText
      accessibilityRole="link"
      variant="micro"
      style={{ color: colors.accent }}
      onPress={(event) => {
        event.stopPropagation();
        router.push(href);
      }}
    >
      {title}
    </ThemedText>
  );
}

function ConsentRow({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: React.ReactNode }) {
  const { colors } = useLedgerTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.consentRow, { opacity: pressed ? 0.68 : 1 }]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.accent : "transparent",
            borderColor: checked ? colors.accent : colors.border,
          },
        ]}
      >
        {checked ? <Check size={13} color={colors.onAccent} strokeWidth={3} /> : null}
      </View>
      <View style={styles.consentCopy}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: spacing.xs },
  header: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tourButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  main: { flex: 1, justifyContent: "space-between", paddingTop: spacing.xxl, paddingBottom: spacing.lg },
  intro: { gap: spacing.xs, maxWidth: 350 },
  introTitle: { fontSize: 30, lineHeight: 36 },
  introCopy: { maxWidth: 340, lineHeight: 21 },
  form: { gap: spacing.sm },
  emailInput: { width: "100%" },
  envNote: { textAlign: "center" },
  footer: { gap: spacing.sm },
  consents: { gap: spacing.xs },
  consentRow: { minHeight: 36, flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginTop: 1 },
  consentCopy: { flex: 1 },
  footerNote: { textAlign: "center" },
});
