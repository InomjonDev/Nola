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

export async function notificationsEnabled() {
  if (!isSupported()) return false;
  return (await secureStorage.getItem(ENABLED_KEY)) === "true" && Notification.permission === "granted";
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
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription && userId) await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", subscription.endpoint);
  if (subscription) await subscription.unsubscribe();
  if (userId) await supabase.from("reminder_preferences").upsert({ user_id: userId, enabled: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

export async function setDailyReminderEnabled(enabled: boolean, userId?: string) {
  if (!enabled) {
    await secureStorage.setItem(ENABLED_KEY, "false");
    await removeSubscription(userId);
    return false;
  }
  if (!isSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    await secureStorage.setItem(ENABLED_KEY, "false");
    return false;
  }
  if (userId && supabase) await saveSubscription(userId);
  await secureStorage.setItem(ENABLED_KEY, "true");
  return true;
}

export async function scheduleNextReminder(hasLoggedToday = false) {
  if (!(await notificationsEnabled())) return false;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const title = hasLoggedToday ? "Walletly is up to date" : "A small check-in";
  const body = hasLoggedToday ? "You logged today. Your next check-in will arrive tomorrow." : "Nothing logged today yet. Add an expense when you are ready.";
  await registration.showNotification(title, { body, tag: DAILY_REMINDER_CHANNEL, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: "/add-expense", kind: "daily_check_in" } });
  return true;
}
