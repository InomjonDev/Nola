create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 1 and 2048),
  p256dh text not null check (char_length(p256dh) between 1 and 256),
  auth text not null check (char_length(auth) between 1 and 256),
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  local_time time not null default '20:00',
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.reminder_preferences enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push_subscriptions_update_own" on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "reminder_preferences_select_own" on public.reminder_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "reminder_preferences_insert_own" on public.reminder_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reminder_preferences_update_own" on public.reminder_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reminder_preferences_delete_own" on public.reminder_preferences for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.push_subscriptions, public.reminder_preferences to authenticated;
