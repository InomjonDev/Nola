alter table public.profiles
  add column ai_parsing_enabled boolean not null default false;

create table public.spending_folders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index spending_folders_user_active_name_unique
  on public.spending_folders (user_id, lower(name)) where deleted_at is null;

create table public.spending_captures (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_text text not null check (char_length(source_text) between 1 and 4000),
  captured_at timestamptz not null,
  folder_id uuid references public.spending_folders(id) on delete set null,
  tag_ids uuid[] not null default '{}',
  parse_status text not null check (parse_status in ('pending', 'processing', 'parsed', 'needs_retry', 'undone')),
  parse_revision integer not null default 1 check (parse_revision > 0),
  parsed_revision integer,
  parsed_items jsonb,
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spending_captures_user_captured_at_idx
  on public.spending_captures (user_id, captured_at desc);
create index spending_captures_user_folder_idx
  on public.spending_captures (user_id, folder_id);

alter table public.expenses
  add column capture_id uuid references public.spending_captures(id) on delete set null,
  add column quantity numeric(12, 3) check (quantity is null or quantity > 0);

create index expenses_user_capture_idx
  on public.expenses (user_id, capture_id) where deleted_at is null;

insert into public.categories (id, user_id, name, color, icon, kind)
values ('00000000-0000-4000-8000-000000000006', null, 'Other', '#7A827D', 'more-horizontal', 'global')
on conflict (id) do nothing;

alter table public.spending_folders enable row level security;
alter table public.spending_captures enable row level security;

create policy spending_folders_select_own on public.spending_folders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy spending_folders_insert_own on public.spending_folders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy spending_folders_update_own on public.spending_folders
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy spending_folders_delete_own on public.spending_folders
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy spending_captures_select_own on public.spending_captures
  for select to authenticated using ((select auth.uid()) = user_id);
create policy spending_captures_insert_own on public.spending_captures
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (folder_id is null or exists (
      select 1 from public.spending_folders f where f.id = folder_id and f.user_id = (select auth.uid())
    ))
    and not exists (
      select 1 from unnest(tag_ids) requested_tag_id
      left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
      where t.id is null
    )
  );
create policy spending_captures_update_own on public.spending_captures
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (folder_id is null or exists (
      select 1 from public.spending_folders f where f.id = folder_id and f.user_id = (select auth.uid())
    ))
    and not exists (
      select 1 from unnest(tag_ids) requested_tag_id
      left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
      where t.id is null
    )
  );
create policy spending_captures_delete_own on public.spending_captures
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists expenses_insert_own on public.expenses;
create policy expenses_insert_own on public.expenses for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and (c.kind = 'global' or c.user_id = (select auth.uid())))
  and exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  and (capture_id is null or exists (
    select 1 from public.spending_captures c where c.id = capture_id and c.user_id = (select auth.uid())
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
  and not exists (
    select 1 from unnest(tag_ids) requested_tag_id
    left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
    where t.id is null
  )
);

create trigger spending_folders_keep_latest before update on public.spending_folders
  for each row execute function public.keep_latest_client_write();
create trigger spending_captures_keep_latest before update on public.spending_captures
  for each row execute function public.keep_latest_client_write();

revoke all on public.spending_folders, public.spending_captures from public, anon;
grant select, insert, update, delete on public.spending_folders, public.spending_captures to authenticated;

create table public.spending_parse_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index spending_parse_attempts_user_time_idx
  on public.spending_parse_attempts (user_id, attempted_at desc);
alter table public.spending_parse_attempts enable row level security;
revoke all on public.spending_parse_attempts from public, anon, authenticated;

create function public.consume_spending_parse_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  active_count bigint;
begin
  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtext(requesting_user::text));
  delete from public.spending_parse_attempts
    where user_id = requesting_user and attempted_at <= now() - interval '60 seconds';
  select count(*) into active_count
    from public.spending_parse_attempts
    where user_id = requesting_user and attempted_at > now() - interval '60 seconds';
  if active_count >= 10 then
    return false;
  end if;

  insert into public.spending_parse_attempts (user_id) values (requesting_user);
  return true;
end;
$$;
revoke all on function public.consume_spending_parse_quota() from public, anon;
grant execute on function public.consume_spending_parse_quota() to authenticated;
