import { COOKIE_CONSENT_KEY } from "@/lib/constants";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

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
  if (!key || distinctId === "demo-user" || typeof window === "undefined") return;
  if (window.localStorage.getItem(COOKIE_CONSENT_KEY) !== "true") return;
  void fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, event, properties: { distinct_id: distinctId, platform: "web", ...properties } }),
  }).catch(() => undefined);
}
