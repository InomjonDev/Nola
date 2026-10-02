alter table public.categories add column if not exists icon text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_icon_length'
  ) then
    alter table public.categories add constraint categories_icon_length check (icon is null or char_length(icon) between 1 and 40);
  end if;
end $$;

update public.categories set icon = case name
  when 'Food' then 'utensils'
  when 'Transport' then 'car'
  when 'Bills' then 'receipt'
  when 'Shopping' then 'shopping-bag'
  when 'Entertainment' then 'clapperboard'
  else icon
end
where kind = 'global' and icon is null;
