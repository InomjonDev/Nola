import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { COOKIE_CONSENT_KEY } from "@/lib/constants";

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export type AnalyticsEvent =
  | "auth_started"
  | "auth_magic_link_sent"
  | "signup_completed"
  | "onboarding_completed"
  | "dashboard_viewed"
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "expense_restored"
  | "history_searched"
  | "data_exported"
  | "account_deleted";

export function track(event: AnalyticsEvent, distinctId: string, properties: Record<string, string | number | boolean> = {}) {
  if (!key || distinctId === "demo-user") return;
  const send = () => fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, event, properties: { distinct_id: distinctId, platform: Platform.OS, ...properties } }),
  }).catch(() => undefined);
  if (Platform.OS === "web") {
    void AsyncStorage.getItem(COOKIE_CONSENT_KEY).then((consent) => { if (consent === "accepted") void send(); });
    return;
  }
  void send();
}
