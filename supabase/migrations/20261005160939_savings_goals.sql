create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  currency text not null check (currency in ('USD', 'UZS', 'RUB', 'EUR', 'GBP')),
  icon text not null default 'wallet' check (icon in ('wallet', 'plane', 'home', 'car', 'gift', 'briefcase', 'heart-pulse', 'shopping-bag')),
  deadline date,
  archived_at timestamptz,
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, currency)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  occurred_on date not null,
  note text check (note is null or char_length(note) <= 160),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id, currency) references public.savings_goals(id, user_id, currency) on delete cascade
);

create index savings_goals_owner_idx on public.savings_goals (user_id);
create index goal_contributions_owner_goal_idx on public.goal_contributions (user_id, goal_id, occurred_on desc);

create trigger savings_goals_keep_latest before update on public.savings_goals for each row execute function public.keep_latest_client_write();
create trigger goal_contributions_00_keep_latest before update on public.goal_contributions for each row execute function public.keep_latest_client_write();

-- Retries may upsert identical records, but cannot move or rewrite saved money.
create function public.protect_goal_contribution()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.id, new.goal_id, new.user_id, new.currency, new.amount, new.kind, new.occurred_on)
    is distinct from row(old.id, old.goal_id, old.user_id, old.currency, old.amount, old.kind, old.occurred_on) then
    raise exception 'Goal contribution financial fields are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_goal_contribution() from public, anon, authenticated;
create trigger goal_contributions_01_protect before update on public.goal_contributions for each row execute function public.protect_goal_contribution();

alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
revoke all on public.savings_goals, public.goal_contributions from anon, authenticated;
grant select, insert, update, delete on public.savings_goals, public.goal_contributions to authenticated;

create policy "savings_goals_select_own" on public.savings_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "savings_goals_insert_own" on public.savings_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "savings_goals_update_own" on public.savings_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "savings_goals_delete_own" on public.savings_goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "goal_contributions_select_own" on public.goal_contributions for select to authenticated using ((select auth.uid()) = user_id);
create policy "goal_contributions_insert_own" on public.goal_contributions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goal_contributions_update_own" on public.goal_contributions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goal_contributions_delete_own" on public.goal_contributions for delete to authenticated using ((select auth.uid()) = user_id);
