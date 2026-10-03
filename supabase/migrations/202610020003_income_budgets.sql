create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  received_at timestamptz not null,
  note text check (note is null or char_length(note) <= 160),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index income_entries_user_received_idx on public.income_entries (user_id, received_at desc) where deleted_at is null;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index budgets_user_month_currency_unique on public.budgets (user_id, month, currency) where deleted_at is null;

create trigger income_entries_keep_latest before update on public.income_entries for each row execute function public.keep_latest_client_write();
create trigger budgets_keep_latest before update on public.budgets for each row execute function public.keep_latest_client_write();

alter table public.income_entries enable row level security;
alter table public.budgets enable row level security;

create policy "income_entries_select_own" on public.income_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "income_entries_insert_own" on public.income_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "income_entries_update_own" on public.income_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "income_entries_delete_own" on public.income_entries for delete to authenticated using ((select auth.uid()) = user_id);

create policy "budgets_select_own" on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "budgets_insert_own" on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "budgets_update_own" on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "budgets_delete_own" on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.income_entries, public.budgets to authenticated;
