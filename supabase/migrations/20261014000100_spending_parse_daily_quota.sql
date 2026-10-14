create or replace function public.consume_spending_parse_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  minute_count bigint;
  day_count bigint;
begin
  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtext(requesting_user::text));
  delete from public.spending_parse_attempts
    where user_id = requesting_user and attempted_at <= now() - interval '24 hours';
  select
    count(*) filter (where attempted_at > now() - interval '60 seconds'),
    count(*)
    into minute_count, day_count
    from public.spending_parse_attempts
    where user_id = requesting_user and attempted_at > now() - interval '24 hours';

  if minute_count >= 10 or day_count >= 30 then
    return false;
  end if;

  insert into public.spending_parse_attempts (user_id) values (requesting_user);
  return true;
end;
$$;

revoke all on function public.consume_spending_parse_quota() from public, anon;
grant execute on function public.consume_spending_parse_quota() to authenticated;
