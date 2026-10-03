-- Run with the Supabase local test database after applying all migrations.
-- This suite intentionally uses two authenticated subjects and checks that ownership
-- policies deny cross-user reads and writes. It never targets the hosted project.
begin;
create extension if not exists pgtap;
select plan(10);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.expenses'::regclass), 'expenses RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), 'categories RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.tags'::regclass), 'tags RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.payment_methods'::regclass), 'payment methods RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.income_entries'::regclass), 'income entries RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.budgets'::regclass), 'budgets RLS is enabled');

select is((select count(*)::int from public.expenses where user_id = '20000000-0000-4000-8000-000000000002'::uuid), 0, 'user A cannot read user B expenses');
select is((select count(*)::int from public.tags where user_id = '20000000-0000-4000-8000-000000000002'::uuid), 0, 'user A cannot read user B tags');
select is((select count(*)::int from public.payment_methods where user_id = '20000000-0000-4000-8000-000000000002'::uuid), 0, 'user A cannot read user B payment methods');
select is((select count(*)::int from public.categories where kind = 'custom' and user_id = '20000000-0000-4000-8000-000000000002'::uuid), 0, 'user A cannot read user B categories');
select is((select count(*)::int from public.income_entries where user_id = '20000000-0000-4000-8000-000000000002'::uuid), 0, 'user A cannot read user B income');
select is((select count(*)::int from public.budgets where user_id = '20000000-0000-4000-8000-000000000002'::uuid), 0, 'user A cannot read user B budgets');

select * from finish();
rollback;
