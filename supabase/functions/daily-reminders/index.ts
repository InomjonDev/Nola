import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response("Missing Supabase server credentials", { status: 500 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("onboarding_completed", true)
    .not("id", "in", `(${await usersWithExpenseToday(supabase, since.toISOString())})`);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    checkedAt: new Date().toISOString(),
    usersNeedingReminder: data?.length ?? 0,
    note: "Connect stored Push API subscriptions and call webpush here. Run from Supabase cron at 20:00 in the chosen user timezone.",
  });
});

async function usersWithExpenseToday(supabase: ReturnType<typeof createClient>, isoStart: string) {
  const { data } = await supabase.from("expenses").select("user_id").gte("spent_at", isoStart).is("deleted_at", null);
  const ids = [...new Set((data ?? []).map((row: { user_id: string }) => row.user_id))];
  return ids.length ? ids.map((id) => `"${id}"`).join(",") : "\"00000000-0000-0000-0000-000000000000\"";
}
