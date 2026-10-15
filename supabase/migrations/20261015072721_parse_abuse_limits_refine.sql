create or replace function public.consume_spending_parse_quota_v2(p_ip_hash text)
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
begin
  if requesting_user is null then
    raise exception 'Authentication required';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Valid network fingerprint required';
  end if;

  -- Lock in the same order for every request to avoid quota races and deadlocks.
  perform pg_advisory_xact_lock(1, hashtext(requesting_user::text));
  perform pg_advisory_xact_lock(2, hashtext(p_ip_hash));
  delete from public.spending_parse_attempts
    where attempted_at <= now() - interval '24 hours';

  select
    count(*) filter (where user_id = requesting_user and attempted_at > now() - interval '60 seconds'),
    count(*) filter (where user_id = requesting_user),
    count(*) filter (where ip_hash = p_ip_hash and attempted_at > now() - interval '60 seconds'),
    count(*) filter (where ip_hash = p_ip_hash)
  into user_minute_count, user_day_count, ip_minute_count, ip_day_count
  from public.spending_parse_attempts
  where attempted_at > now() - interval '24 hours';

  if user_minute_count >= 10 or user_day_count >= 30
    or ip_minute_count >= 30 or ip_day_count >= 150 then
    return false;
  end if;

  insert into public.spending_parse_attempts (user_id, ip_hash)
    values (requesting_user, p_ip_hash);
  return true;
end;
$$;

revoke all on function public.consume_spending_parse_quota_v2(text) from public, anon;
grant execute on function public.consume_spending_parse_quota_v2(text) to authenticated;
