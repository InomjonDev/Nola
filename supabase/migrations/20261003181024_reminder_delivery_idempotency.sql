alter table public.reminder_preferences
  add column last_notified_on date;

comment on column public.reminder_preferences.last_notified_on is
  'Local calendar date on which the daily push reminder was delivered; prevents duplicate cron sends.';
