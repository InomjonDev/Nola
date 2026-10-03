import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.0.0";

type ReminderPreference = { user_id: string; timezone: string; local_time: string };
type PushSubscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? readSecretKey();
const cronSecret = Deno.env.get("WALLETLY_CRON_SECRET");
const vapidPublicKey = Deno.env.get("WALLETLY_VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("WALLETLY_VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("WALLETLY_VAPID_SUBJECT") ?? "mailto:security@walletly.app";

if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (request) => {
  if (!supabaseUrl || !serviceRoleKey || !cronSecret || !vapidPublicKey || !vapidPrivateKey) return Response.json({ error: "Reminder function is not configured" }, { status: 500 });
  if (request.headers.get("x-walletly-cron-secret") !== cronSecret) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: preferences, error: preferenceError } = await supabase.from("reminder_preferences").select("user_id, timezone, local_time").eq("enabled", true);
  if (preferenceError) return Response.json({ error: preferenceError.message }, { status: 500 });

  let checked = 0;
  let sent = 0;
  let removed = 0;
  for (const preference of (preferences ?? []) as ReminderPreference[]) {
    if (!isDue(preference)) continue;
    checked += 1;
    const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").eq("user_id", preference.user_id);
    if (subscriptionError) return Response.json({ error: subscriptionError.message }, { status: 500 });
    if (!subscriptions?.length || await loggedToday(supabase, preference.user_id, preference.timezone)) continue;
    for (const subscription of subscriptions as PushSubscription[]) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "A small Walletly check-in", body: "Nothing logged today yet. Add an expense when you are ready.", tag: "daily-check-in", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", url: "/add-expense" }));
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          removed += 1;
        } else {
          console.error("Walletly push delivery failed", { userId: subscription.user_id, statusCode });
        }
      }
    }
  }
  return Response.json({ checkedAt: new Date().toISOString(), checked, sent, removed });
});

function readSecretKey() {
  try {
    const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return typeof secrets.default === "string" ? secrets.default : undefined;
  } catch {
    return undefined;
  }
}

function isDue(preference: ReminderPreference) {
  const now = new Date();
  const local = new Intl.DateTimeFormat("en-GB", { timeZone: preference.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const [hour, minute] = preference.local_time.slice(0, 5).split(":").map(Number);
  const [localHour, localMinute] = local.split(":").map(Number);
  return hour === localHour && minute === localMinute;
}

async function loggedToday(supabase: ReturnType<typeof createClient>, userId: string, timezone: string) {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const { data, error } = await supabase.from("expenses").select("spent_at").eq("user_id", userId).is("deleted_at", null).gte("spent_at", new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString());
  if (error) throw error;
  return (data ?? []).some((row: { spent_at: string }) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.spent_at)) === localDate);
}
