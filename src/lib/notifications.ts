import { secureStorage } from "@/lib/secure-storage";

const ENABLED_KEY = "walletly.notifications-enabled";
export const DAILY_REMINDER_CHANNEL = "daily-check-in";

export async function notificationsEnabled() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return (await secureStorage.getItem(ENABLED_KEY)) === "true" && Notification.permission === "granted";
}

export async function setDailyReminderEnabled(enabled: boolean) {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return false;
  if (!enabled) {
    await secureStorage.setItem(ENABLED_KEY, "false");
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    await secureStorage.setItem(ENABLED_KEY, "false");
    return false;
  }
  await navigator.serviceWorker.ready;
  await secureStorage.setItem(ENABLED_KEY, "true");
  return true;
}

export async function scheduleNextReminder(hasLoggedToday = false) {
  if (!(await notificationsEnabled())) return false;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const title = hasLoggedToday ? "Walletly is up to date" : "A small check-in";
  const body = hasLoggedToday
    ? "You logged today. Tomorrow's reminder still needs backend scheduling for closed-app delivery."
    : "Nothing logged today yet. Add an expense when you are ready.";
  await registration.showNotification(title, {
    body,
    tag: DAILY_REMINDER_CHANNEL,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: "/add-expense", kind: "daily_check_in" },
  });
  return true;
}
