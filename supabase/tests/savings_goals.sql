-- Self-contained populated RLS/constraint checks. Run on a local test database only.
begin;
select '1..22';

create function pg_temp.expect_error(statement text, expected_state text)
returns text language plpgsql as $$
declare failed boolean := false;
begin
  begin
    execute statement;
  exception when others then
    failed := true;
    if sqlstate <> expected_state then
      raise exception 'Expected SQLSTATE %, got %: %', expected_state, sqlstate, sqlerrm;
    end if;
  end;
  if not failed then raise exception 'Expected SQLSTATE % for: %', expected_state, statement; end if;
  return 'ok - rejects operation with SQLSTATE ' || expected_state;
end;
$$;

insert into auth.users (id) values ('10000000-0000-4000-8000-000000000001'), ('20000000-0000-4000-8000-000000000002');
insert into public.savings_goals (id, user_id, name, target_amount, currency) values
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Private B goal', 500, 'USD');
insert into public.goal_contributions (id, goal_id, user_id, amount, currency, kind, occurred_on) values
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 50, 'USD', 'deposit', '2026-10-05');

set local role anon;
select pg_temp.expect_error('select * from public.savings_goals', '42501');
select pg_temp.expect_error('select * from public.goal_contributions', '42501');
select pg_temp.expect_error($q$insert into public.savings_goals (user_id, name, target_amount, currency) values ('10000000-0000-4000-8000-000000000001', 'Anon', 100, 'USD')$q$, '42501');
select pg_temp.expect_error($q$update public.savings_goals set name = 'Anon'$q$, '42501');
select pg_temp.expect_error('delete from public.savings_goals', '42501');
select pg_temp.expect_error($q$insert into public.goal_contributions (goal_id, user_id, amount, currency, kind, occurred_on) values ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 1, 'USD', 'deposit', '2026-10-05')$q$, '42501');
select pg_temp.expect_error($q$update public.goal_contributions set note = 'Anon'$q$, '42501');
select pg_temp.expect_error('delete from public.goal_contributions', '42501');
reset role;

do $$begin perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true); end;$$;
set local role authenticated;
do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.savings_goals'::regclass), 'goals RLS disabled';
  assert (select relrowsecurity from pg_class where oid = 'public.goal_contributions'::regclass), 'contributions RLS disabled';
  assert (select count(*) from public.savings_goals) = 0, 'A can read B goals';
  assert (select count(*) from public.goal_contributions) = 0, 'A can read B contributions';
end;
$$;
select 'ok - RLS enabled and populated cross-user reads denied';

insert into public.savings_goals (id, user_id, name, target_amount, currency) values
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'A goal', 100, 'USD');
insert into public.goal_contributions (id, goal_id, user_id, amount, currency, kind, occurred_on) values
  ('60000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 40, 'USD', 'deposit', '2026-10-05');

select pg_temp.expect_error($q$insert into public.savings_goals (user_id, name, target_amount, currency) values ('20000000-0000-4000-8000-000000000002', 'Forged', 100, 'USD')$q$, '42501');
select pg_temp.expect_error($q$update public.savings_goals set user_id = '20000000-0000-4000-8000-000000000002' where id = '50000000-0000-4000-8000-000000000005'$q$, '42501');
select pg_temp.expect_error($q$insert into public.goal_contributions (goal_id, user_id, amount, currency, kind, occurred_on) values ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 1, 'USD', 'deposit', '2026-10-05')$q$, '23503');
select pg_temp.expect_error($q$insert into public.goal_contributions (goal_id, user_id, amount, currency, kind, occurred_on) values ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 1, 'USD', 'deposit', '2026-10-05')$q$, '42501');
select pg_temp.expect_error($q$insert into public.goal_contributions (goal_id, user_id, amount, currency, kind, occurred_on) values ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 1, 'EUR', 'deposit', '2026-10-05')$q$, '23503');
select pg_temp.expect_error($q$update public.savings_goals set currency = 'EUR' where id = '50000000-0000-4000-8000-000000000005'$q$, '23503');
select pg_temp.expect_error($q$update public.goal_contributions set amount = 99 where id = '60000000-0000-4000-8000-000000000006'$q$, '23514');
select pg_temp.expect_error($q$update public.goal_contributions set user_id = '20000000-0000-4000-8000-000000000002' where id = '60000000-0000-4000-8000-000000000006'$q$, '23514');
select pg_temp.expect_error($q$insert into public.savings_goals (user_id, name, target_amount, currency) values ('10000000-0000-4000-8000-000000000001', 'Invalid', 0, 'USD')$q$, '23514');
select pg_temp.expect_error($q$insert into public.goal_contributions (goal_id, user_id, amount, currency, kind, occurred_on) values ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', -1, 'USD', 'deposit', '2026-10-05')$q$, '23514');

do $$
declare affected integer;
begin
  update public.savings_goals set name = 'Forged update' where user_id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  assert affected = 0, 'A updated B goal';
  delete from public.savings_goals where user_id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  assert affected = 0, 'A deleted B goal';
  update public.goal_contributions set note = 'Forged update' where user_id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  assert affected = 0, 'A updated B contribution';
  delete from public.goal_contributions where user_id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  assert affected = 0, 'A deleted B contribution';
end;
$$;
select 'ok - cross-user updates and deletes denied';

-- Simulate a retry after a successful insert whose response was lost.
insert into public.goal_contributions (id, goal_id, user_id, amount, currency, kind, occurred_on) values
  ('60000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 40, 'USD', 'deposit', '2026-10-05')
on conflict (id) do update set amount = excluded.amount;
update public.savings_goals set target_amount = 200, client_updated_at = now() + interval '1 hour' where id = '50000000-0000-4000-8000-000000000005';
update public.savings_goals set target_amount = 100, client_updated_at = now() where id = '50000000-0000-4000-8000-000000000005';
do $$
begin
  assert (select count(*) from public.goal_contributions) = 1, 'retry duplicated contribution';
  assert (select target_amount from public.savings_goals where id = '50000000-0000-4000-8000-000000000005') = 200, 'stale update overwrote goal';
end;
$$;
select 'ok - stable IDs and latest-write protection survive retries';

do $$begin perform public.delete_own_account(); end;$$;
reset role;
do $$
begin
  assert not exists (select 1 from public.savings_goals where user_id = '10000000-0000-4000-8000-000000000001'), 'account deletion retained goals';
  assert not exists (select 1 from public.goal_contributions where user_id = '10000000-0000-4000-8000-000000000001'), 'account deletion retained contributions';
  assert exists (select 1 from public.savings_goals where user_id = '20000000-0000-4000-8000-000000000002'), 'account deletion affected another user';
end;
$$;
select 'ok - account deletion cascades without affecting another user';
rollback;
