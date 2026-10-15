# Database migrations

Nola uses **imperative SQL migrations** in `supabase/migrations/`; there is no `supabase/schemas/` declarative schema directory. Migration files are the versioned history of the hosted schema. Keep schema changes out of app startup and Vercel build steps.

## Migration history

Apply these files in lexical/filename order:

1. `202610010001_expense_tracker_mvp.sql` — profiles, payment methods, categories, tags, expenses, shared write trigger, baseline RLS, delete-own-account function, and initial global categories.
2. `202610020002_category_icons.sql` — category icon field and initial icon values.
3. `202610020003_income_budgets.sql` — income entries and overall monthly budgets.
4. `202610020004_push_reminders.sql` — push subscriptions and reminder preferences.
5. `20261003181024_reminder_delivery_idempotency.sql` — per-user last-delivered local date.
6. `20261005160939_savings_goals.sql` — savings goals, contributions, ownership/currency relationship, and contribution immutability.
7. `20261012220000_nola_spending_notes.sql` — folders, spending captures, expense links/quantity, AI consent, parse quota, and related RLS.
8. `20261013080113_cloud_finance_sync_entities.sql` — accounts, category budgets, recurring rules, account adjustments, and related expense/income integrity policies.
9. `20261014000100_spending_parse_daily_quota.sql` — caps authenticated AI parsing at 10 attempts per minute and 30 attempts per rolling 24 hours.
10. `20261015123935_reset_ai_consent_for_gemini.sql` — clears consent given for the previous provider so users approve the Google Gemini disclosure before parsing again.

Do not edit an already-applied migration to change deployed state. Add a new forward migration; production rollback is another reviewed migration, not editing history or resetting the database.

## Safe workflow

### 1. Prepare locally

- Start from a branch and confirm the exact repository/project you are changing.
- Check the installed Supabase CLI version and its help before using commands; CLI syntax is versioned.
- Create the migration with the CLI so its timestamp/name sorts correctly:

  ```sh
  supabase migration new describe_the_change
  ```

- Write an additive change where possible. For a field rename or type change, use expand/contract: add a compatible field, deploy code that can read/write both, backfill and verify, then remove the old field in a later migration.
- Include constraints, indexes, grants, RLS enablement, policies, and function privilege changes with the schema change. Review every generated or hand-written SQL statement.

### 2. Rebuild and test a disposable database

With the local Supabase stack running, rebuild it from the full migration history and run the database checks:

```sh
supabase start
supabase db reset
npm run test:rls
npm run test:goals:db
npm test
```

`supabase db reset` destroys and recreates the **local** database, then replays migrations (and any configured seed file). Never run it against a linked production database. The RLS SQL uses synthetic users and rolls back; keep database security tests pointed at local or disposable test projects.

Run the app checks too:

```sh
npm run typecheck
npm run lint
npm run build
```

### 3. Review and stage

- Review the migration diff and test the old and new app versions around the migration where possible.
- Run `supabase migration list --linked` only after confirming the link points to the intended **staging** project.
- Deploy to staging and exercise sign-in, offline sync, create/update/delete, account deletion, and any affected exports or notifications.
- Confirm every new exposed table has RLS, required grants, owner checks, relationship checks, and cross-user tests.
- For data migrations, record row counts before and after; make backfills restartable and batch large tables.

### 4. Deploy to production

1. Confirm the project reference shown by `supabase link`/CLI status matches the intended production project. `project_id = "nola"` in local `supabase/config.toml` is only the local CLI project name; do not use it as proof of a remote target.
2. Confirm a current backup/restore path and a rollback plan. Review destructive DDL separately; migrations should generally roll forward.
3. Preview the pending remote migration list before applying. With the verified production project linked, use the CLI preview and then apply:

   ```sh
   supabase db push --dry-run
   supabase db push
   supabase migration list --linked
   ```

4. Verify migration history and essential application queries after deployment. Watch logs and error rates. Deploy the corresponding app version only when its expected schema is present.

Never paste database passwords, service-role keys, or connection strings into committed files or migration SQL. Never use the production project for local resets, fixture inserts, or RLS tests.

## Drift and recovery

- Prefer migrations over manual Dashboard schema edits. If a remote edit is unavoidable, immediately capture and review it as a migration before making further changes.
- If remote migration history differs from this repository, stop before `db push`. Compare `supabase migration list` with the files, inspect the actual schema, and use `migration repair` only after determining exactly which migration was applied or skipped. It changes history and does not execute the migration SQL.
- If an already-deployed migration needs correction, write a new forward migration that restores the intended shape. Do not reset or rewrite production history.

## References

- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase database testing overview](https://supabase.com/docs/guides/local-development/testing/overview)
