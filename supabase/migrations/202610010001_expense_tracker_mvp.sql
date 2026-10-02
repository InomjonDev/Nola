create extension if not exists pgcrypto;

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  archived_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  default_payment_method_id uuid references public.payment_methods(id) on delete set null,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  kind text not null check (kind in ('global', 'custom')),
  archived_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_ownership check (
    (kind = 'global' and user_id is null and archived_at is null)
    or (kind = 'custom' and user_id is not null)
  )
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tags_user_name_unique on public.tags (user_id, lower(name));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  spent_at timestamptz not null,
  category_id uuid not null references public.categories(id),
  payment_method_id uuid not null references public.payment_methods(id),
  note text check (note is null or char_length(note) <= 160),
  tag_ids uuid[] not null default '{}',
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_spent_at_idx on public.expenses (user_id, spent_at desc) where deleted_at is null;
create index expenses_user_category_idx on public.expenses (user_id, category_id) where deleted_at is null;
create index categories_user_active_idx on public.categories (user_id, name) where archived_at is null;

create or replace function public.keep_latest_client_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return old;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger payment_methods_keep_latest before update on public.payment_methods for each row execute function public.keep_latest_client_write();
create trigger categories_keep_latest before update on public.categories for each row execute function public.keep_latest_client_write();
create trigger tags_keep_latest before update on public.tags for each row execute function public.keep_latest_client_write();
create trigger expenses_keep_latest before update on public.expenses for each row execute function public.keep_latest_client_write();

insert into public.categories (id, user_id, name, color, kind) values
  ('00000000-0000-4000-8000-000000000001', null, 'Food', '#2B8A68', 'global'),
  ('00000000-0000-4000-8000-000000000002', null, 'Transport', '#3E75B8', 'global'),
  ('00000000-0000-4000-8000-000000000003', null, 'Bills', '#B7782C', 'global'),
  ('00000000-0000-4000-8000-000000000004', null, 'Shopping', '#9B5F86', 'global'),
  ('00000000-0000-4000-8000-000000000005', null, 'Entertainment', '#C85A4D', 'global')
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.payment_methods enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.expenses enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (
  (select auth.uid()) = id
  and (default_payment_method_id is null or exists (
    select 1 from public.payment_methods p where p.id = default_payment_method_id and p.user_id = (select auth.uid())
  ))
);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check (
  (select auth.uid()) = id
  and (default_payment_method_id is null or exists (
    select 1 from public.payment_methods p where p.id = default_payment_method_id and p.user_id = (select auth.uid())
  ))
);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "payment_methods_select_own" on public.payment_methods for select to authenticated using ((select auth.uid()) = user_id);
create policy "payment_methods_insert_own" on public.payment_methods for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "payment_methods_update_own" on public.payment_methods for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "payment_methods_delete_own" on public.payment_methods for delete to authenticated using ((select auth.uid()) = user_id);

create policy "categories_select_visible" on public.categories for select to authenticated using (kind = 'global' or (select auth.uid()) = user_id);
create policy "categories_insert_custom" on public.categories for insert to authenticated with check (kind = 'custom' and (select auth.uid()) = user_id);
create policy "categories_update_custom" on public.categories for update to authenticated using (kind = 'custom' and (select auth.uid()) = user_id) with check (kind = 'custom' and (select auth.uid()) = user_id);
create policy "categories_delete_custom" on public.categories for delete to authenticated using (kind = 'custom' and (select auth.uid()) = user_id);

create policy "tags_select_own" on public.tags for select to authenticated using ((select auth.uid()) = user_id);
create policy "tags_insert_own" on public.tags for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tags_update_own" on public.tags for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tags_delete_own" on public.tags for delete to authenticated using ((select auth.uid()) = user_id);

create policy "expenses_select_own" on public.expenses for select to authenticated using ((select auth.uid()) = user_id);
create policy "expenses_insert_own" on public.expenses for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and (c.kind = 'global' or c.user_id = (select auth.uid())))
  and exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  and not exists (
    select 1 from unnest(tag_ids) requested_tag_id
    left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
    where t.id is null
  )
);
create policy "expenses_update_own" on public.expenses for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and (c.kind = 'global' or c.user_id = (select auth.uid())))
  and exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  and not exists (
    select 1 from unnest(tag_ids) requested_tag_id
    left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
    where t.id is null
  )
);
create policy "expenses_delete_own" on public.expenses for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.payment_methods, public.categories, public.tags, public.expenses to authenticated;
revoke all on function public.keep_latest_client_write() from public, anon, authenticated;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = requesting_user;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is 'Deletes only the currently authenticated user. Execute is restricted to authenticated users.';
