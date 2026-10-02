import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ENABLED_KEY = "walletly.notifications-enabled";
const REMINDER_IDS_KEY = "walletly.daily-reminder-ids";
const REMINDER_DAYS = 7;
export const DAILY_REMINDER_CHANNEL = "daily-check-in";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL, {
    name: "Daily check-in",
    description: "A quiet reminder to keep your spending picture current.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 0, 0],
    enableVibrate: false,
    sound: null,
  });
}

async function readReminderIds() {
  const raw = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

async function clearReminderSchedule() {
  const ids = await readReminderIds();
  await Promise.all(ids.map(async (id) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // A notification may already have fired or been removed by the OS.
    }
  }));
  await AsyncStorage.removeItem(REMINDER_IDS_KEY);
}

function reminderDates(hasLoggedToday: boolean) {
  const now = new Date();
  const first = new Date(now);
  first.setHours(20, 0, 0, 0);
  if (hasLoggedToday || first <= now) first.setDate(first.getDate() + 1);
  return Array.from({ length: REMINDER_DAYS }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

export async function notificationsEnabled() {
  if (Platform.OS === "web") return false;
  if ((await AsyncStorage.getItem(ENABLED_KEY)) !== "true") return false;
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted;
}

export async function setDailyReminderEnabled(enabled: boolean, hasLoggedToday = false) {
  if (Platform.OS === "web") return false;
  if (enabled) {
    const permissions = await Notifications.requestPermissionsAsync();
    if (!permissions.granted) return false;
    await configureAndroidChannel();
    await AsyncStorage.setItem(ENABLED_KEY, "true");
    const scheduled = await scheduleNextReminder(hasLoggedToday);
    if (!scheduled) await AsyncStorage.setItem(ENABLED_KEY, "false");
    return scheduled;
  }
  await AsyncStorage.setItem(ENABLED_KEY, "false");
  await clearReminderSchedule();
  return false;
}

export async function scheduleNextReminder(hasLoggedToday = false) {
  if (Platform.OS === "web" || !(await notificationsEnabled())) return false;
  try {
    await configureAndroidChannel();
    await clearReminderSchedule();
    const results = await Promise.allSettled(reminderDates(hasLoggedToday).map((date) => Notifications.scheduleNotificationAsync({
      content: {
        title: "A small check-in",
        body: "Nothing logged today yet. Keep your Walletly picture current.",
        data: { screen: "/add-expense", kind: "daily_check_in" },
        ...(Platform.OS === "android" ? { channelId: DAILY_REMINDER_CHANNEL } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    })));
    const ids = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(ids));
    if (ids.length !== results.length) throw new Error("Some daily reminders could not be scheduled.");
    return true;
  } catch {
    await clearReminderSchedule();
    return false;
  }
}
