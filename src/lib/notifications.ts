import { secureStorage } from "@/lib/secure-storage";
import { supabase } from "@/lib/supabase";

const ENABLED_KEY = "walletly.notifications-enabled";
export const DAILY_REMINDER_CHANNEL = "daily-check-in";

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function notificationsEnabled(userId?: string) {
  if (!isSupported() || !userId || !supabase || Notification.permission !== "granted") return false;
  if ((await secureStorage.getItem(ENABLED_KEY)) !== "true") return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    const { data, error } = await supabase.from("reminder_preferences").select("enabled").eq("user_id", userId).maybeSingle();
    return !error && data?.enabled === true;
  } catch {
    return false;
  }
}

async function saveSubscription(userId: string) {
  if (!supabase || !isSupported()) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(publicKey) });
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) return false;
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent.slice(0, 500),
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { error: preferenceError } = await supabase.from("reminder_preferences").upsert({ user_id: userId, enabled: true, timezone, local_time: "20:00", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (preferenceError) throw preferenceError;
  return true;
}

async function removeSubscription(userId?: string) {
  if (!supabase || !isSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && userId) {
    const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", subscription.endpoint);
    if (error) throw error;
  }
  if (subscription) await subscription.unsubscribe();
  if (userId) {
    const { error } = await supabase.from("reminder_preferences").upsert({ user_id: userId, enabled: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
  }
}

export async function clearLocalReminders() {
  await secureStorage.setItem(ENABLED_KEY, "false");
  if (!isSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
}

export async function setDailyReminderEnabled(enabled: boolean, userId?: string) {
  if (!enabled) {
    await secureStorage.setItem(ENABLED_KEY, "false");
    await removeSubscription(userId);
    return false;
  }
  if (!userId || !supabase || !isSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    await secureStorage.setItem(ENABLED_KEY, "false");
    return false;
  }
  const registered = await saveSubscription(userId);
  if (!registered) return false;
  await secureStorage.setItem(ENABLED_KEY, "true");
  return true;
}
