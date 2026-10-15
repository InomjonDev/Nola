-- Keep a short, private record of parser attempts so one account, one network,
-- or the whole project cannot generate unbounded model traffic.
alter table public.spending_parse_attempts
  add column if not exists ip_hash text;

alter table public.spending_parse_attempts
  add constraint spending_parse_attempts_ip_hash_format
  check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$');

create index if not exists spending_parse_attempts_ip_time_idx
  on public.spending_parse_attempts (ip_hash, attempted_at desc)
  where ip_hash is not null;
create index if not exists spending_parse_attempts_time_idx
  on public.spending_parse_attempts (attempted_at desc);

create function public.consume_spending_parse_quota_v2(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  user_minute_count bigint;
  user_day_count bigint;
  ip_minute_count bigint;
  ip_day_count bigint;
  project_day_count bigint;
begin
  if requesting_user is null then
    raise exception 'Authentication required';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Valid network fingerprint required';
  end if;

  -- A single transaction lock makes the shared and per-IP counters atomic.
  perform pg_advisory_xact_lock(92125063057::bigint);
  delete from public.spending_parse_attempts
    where attempted_at <= now() - interval '24 hours';

  select
    count(*) filter (where user_id = requesting_user and attempted_at > now() - interval '60 seconds'),
    count(*) filter (where user_id = requesting_user),
    count(*) filter (where ip_hash = p_ip_hash and attempted_at > now() - interval '60 seconds'),
    count(*) filter (where ip_hash = p_ip_hash),
    count(*)
  into user_minute_count, user_day_count, ip_minute_count, ip_day_count, project_day_count
  from public.spending_parse_attempts
  where attempted_at > now() - interval '24 hours';

  if user_minute_count >= 10 or user_day_count >= 30
    or ip_minute_count >= 30 or ip_day_count >= 150
    or project_day_count >= 300 then
    return false;
  end if;

  insert into public.spending_parse_attempts (user_id, ip_hash)
    values (requesting_user, p_ip_hash);
  return true;
end;
$$;

revoke all on public.spending_parse_attempts from public, anon, authenticated;
revoke all on function public.consume_spending_parse_quota_v2(text) from public, anon;
grant execute on function public.consume_spending_parse_quota_v2(text) to authenticated;
