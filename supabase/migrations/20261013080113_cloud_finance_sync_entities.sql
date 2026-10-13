create table public.accounts (
  id uuid primary key references public.payment_methods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind text not null check (kind in ('cash', 'bank', 'card')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  starting_balance numeric(14, 2) not null check (starting_balance >= 0),
  archived_at timestamptz,
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, currency)
);

create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  cadence text not null check (cadence in ('weekly', 'monthly')),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index category_budgets_active_unique
  on public.category_budgets (user_id, category_id, currency, cadence)
  where deleted_at is null;

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id),
  payment_method_id uuid references public.payment_methods(id),
  note text check (note is null or char_length(note) <= 160),
  tag_ids uuid[] not null default '{}',
  frequency text not null check (frequency in ('weekly', 'monthly')),
  start_date date not null,
  next_run_date date not null,
  archived_at timestamptz,
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, currency),
  check (
    (kind = 'expense' and category_id is not null and payment_method_id is not null)
    or (kind = 'income' and category_id is null and payment_method_id is null)
  )
);

create index recurring_rules_user_next_run_idx
  on public.recurring_rules (user_id, next_run_date)
  where archived_at is null and deleted_at is null;

alter table public.expenses
  add column recurring_rule_id uuid references public.recurring_rules(id) on delete set null;

alter table public.income_entries
  add column account_id uuid references public.accounts(id) on delete set null,
  add column recurring_rule_id uuid references public.recurring_rules(id) on delete set null;

create index expenses_user_recurring_rule_idx
  on public.expenses (user_id, recurring_rule_id)
  where recurring_rule_id is not null;
create index income_entries_user_recurring_rule_idx
  on public.income_entries (user_id, recurring_rule_id)
  where recurring_rule_id is not null;

create table public.account_adjustments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14, 2) not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  occurred_on date not null,
  note text check (note is null or char_length(note) <= 160),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency) on delete cascade
);

create index account_adjustments_user_account_date_idx
  on public.account_adjustments (user_id, account_id, occurred_on desc)
  where deleted_at is null;

create trigger accounts_keep_latest before update on public.accounts
  for each row execute function public.keep_latest_client_write();
create trigger category_budgets_keep_latest before update on public.category_budgets
  for each row execute function public.keep_latest_client_write();
create trigger recurring_rules_keep_latest before update on public.recurring_rules
  for each row execute function public.keep_latest_client_write();
create trigger account_adjustments_keep_latest before update on public.account_adjustments
  for each row execute function public.keep_latest_client_write();

alter table public.accounts enable row level security;
alter table public.category_budgets enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.account_adjustments enable row level security;

revoke all on public.accounts, public.category_budgets, public.recurring_rules, public.account_adjustments
  from public, anon;
grant select, insert, update, delete on public.accounts, public.category_budgets, public.recurring_rules, public.account_adjustments
  to authenticated;

create policy accounts_select_own on public.accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy accounts_insert_own on public.accounts
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.payment_methods p
      where p.id = accounts.id and p.user_id = (select auth.uid())
    )
  );
create policy accounts_update_own on public.accounts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.payment_methods p
      where p.id = accounts.id and p.user_id = (select auth.uid())
    )
  );
create policy accounts_delete_own on public.accounts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy category_budgets_select_own on public.category_budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy category_budgets_insert_own on public.category_budgets
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.categories c
      where c.id = category_budgets.category_id
        and (c.kind = 'global' or c.user_id = (select auth.uid()))
    )
  );
create policy category_budgets_update_own on public.category_budgets
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.categories c
      where c.id = category_budgets.category_id
        and (c.kind = 'global' or c.user_id = (select auth.uid()))
    )
  );
create policy category_budgets_delete_own on public.category_budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy recurring_rules_select_own on public.recurring_rules
  for select to authenticated using ((select auth.uid()) = user_id);
create policy recurring_rules_insert_own on public.recurring_rules
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = recurring_rules.account_id and a.user_id = (select auth.uid())
        and a.currency = recurring_rules.currency
    ))
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = recurring_rules.category_id
        and (c.kind = 'global' or c.user_id = (select auth.uid()))
    ))
    and (payment_method_id is null or exists (
      select 1 from public.payment_methods p
      where p.id = recurring_rules.payment_method_id and p.user_id = (select auth.uid())
    ))
    and not exists (
      select 1 from unnest(tag_ids) requested_tag_id
      left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
      where t.id is null
    )
  );
create policy recurring_rules_update_own on public.recurring_rules
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = recurring_rules.account_id and a.user_id = (select auth.uid())
        and a.currency = recurring_rules.currency
    ))
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = recurring_rules.category_id
        and (c.kind = 'global' or c.user_id = (select auth.uid()))
    ))
    and (payment_method_id is null or exists (
      select 1 from public.payment_methods p
      where p.id = recurring_rules.payment_method_id and p.user_id = (select auth.uid())
    ))
    and not exists (
      select 1 from unnest(tag_ids) requested_tag_id
      left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
      where t.id is null
    )
  );
create policy recurring_rules_delete_own on public.recurring_rules
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy account_adjustments_select_own on public.account_adjustments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy account_adjustments_insert_own on public.account_adjustments
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.accounts a
      where a.id = account_adjustments.account_id and a.user_id = (select auth.uid())
        and a.currency = account_adjustments.currency
    )
  );
create policy account_adjustments_update_own on public.account_adjustments
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.accounts a
      where a.id = account_adjustments.account_id and a.user_id = (select auth.uid())
        and a.currency = account_adjustments.currency
    )
  );
create policy account_adjustments_delete_own on public.account_adjustments
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists expenses_insert_own on public.expenses;
create policy expenses_insert_own on public.expenses for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and (c.kind = 'global' or c.user_id = (select auth.uid())))
  and exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  and (capture_id is null or exists (
    select 1 from public.spending_captures c where c.id = capture_id and c.user_id = (select auth.uid())
  ))
  and (recurring_rule_id is null or exists (
    select 1 from public.recurring_rules r
    where r.id = expenses.recurring_rule_id and r.user_id = (select auth.uid())
      and r.kind = 'expense' and r.currency = expenses.currency
  ))
  and not exists (
    select 1 from unnest(tag_ids) requested_tag_id
    left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
    where t.id is null
  )
);
drop policy if exists expenses_update_own on public.expenses;
create policy expenses_update_own on public.expenses for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and (c.kind = 'global' or c.user_id = (select auth.uid())))
  and exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  and (capture_id is null or exists (
    select 1 from public.spending_captures c where c.id = capture_id and c.user_id = (select auth.uid())
  ))
  and (recurring_rule_id is null or exists (
    select 1 from public.recurring_rules r
    where r.id = expenses.recurring_rule_id and r.user_id = (select auth.uid())
      and r.kind = 'expense' and r.currency = expenses.currency
  ))
  and not exists (
    select 1 from unnest(tag_ids) requested_tag_id
    left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
    where t.id is null
  )
);

drop policy if exists income_entries_insert_own on public.income_entries;
create policy income_entries_insert_own on public.income_entries for insert to authenticated with check (
  (select auth.uid()) = user_id
  and (account_id is null or exists (
    select 1 from public.accounts a
    where a.id = income_entries.account_id and a.user_id = (select auth.uid())
      and a.currency = income_entries.currency
  ))
  and (recurring_rule_id is null or exists (
    select 1 from public.recurring_rules r
    where r.id = income_entries.recurring_rule_id and r.user_id = (select auth.uid())
      and r.kind = 'income' and r.currency = income_entries.currency
  ))
);
drop policy if exists income_entries_update_own on public.income_entries;
create policy income_entries_update_own on public.income_entries for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and (account_id is null or exists (
    select 1 from public.accounts a
    where a.id = income_entries.account_id and a.user_id = (select auth.uid())
      and a.currency = income_entries.currency
  ))
  and (recurring_rule_id is null or exists (
    select 1 from public.recurring_rules r
    where r.id = income_entries.recurring_rule_id and r.user_id = (select auth.uid())
      and r.kind = 'income' and r.currency = income_entries.currency
  ))
);
