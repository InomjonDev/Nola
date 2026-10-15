# Seed and test data

## Current seed sources

| Source | What it creates | Where it runs | Intended use |
| --- | --- | --- | --- |
| `supabase/migrations/202610010001_expense_tracker_mvp.sql` | Five global categories with stable IDs: Food, Transport, Bills, Shopping, Entertainment | Every database built from migrations | Product reference data |
| `supabase/migrations/202610020002_category_icons.sql` | Icon values for global categories | Migration replay/deployment | Product reference data |
| `supabase/migrations/20261012220000_nola_spending_notes.sql` | The global Other category | Migration replay/deployment | Product reference data |
| `src/lib/demo-data.ts` | Local sample methods/accounts, tag, expenses, income, budgets, a recurring rule, a goal, and a contribution | Browser local demo only | UI demonstration and local exploration |
| `supabase/tests/rls.sql` | Two synthetic user IDs and policy assertions inside a rolled-back transaction | Disposable local database | RLS regression checks |
| `supabase/tests/savings_goals.sql` | Synthetic users, a goal, and contribution used for FK, RLS, immutable-field, retry, and cascade checks | Disposable local database | Savings-goal database checks |
| `tests/e2e/*.spec.ts` | Browser storage fixtures and mocked Auth/Data API responses | Playwright browser contexts | End-to-end test setup |

There is currently no `supabase/seed.sql`. The browser demo is not a database seed and must not be uploaded to a hosted project. Global categories are the only application rows inserted by migrations.

## Demo fixture shape

`createDemoData()` builds `PersistedAppData` under the special local identity `demo-user`. It currently includes three example expenses (coffee, transport, groceries), one monthly income entry, one overall budget, weekly/monthly category budgets, one monthly expense rule, three accounts matching the three payment methods, one savings goal, and one deposit. IDs are generated when the demo data is created; they are not stable database IDs. The demo profile disables AI parsing and `syncQueue` starts empty.

The demo must remain isolated from Auth users and the Supabase Data API. Do not add production users, real emails, real spending, push endpoints, auth tokens, or provider/API secrets to any fixture.

## Disposable pre-launch scenario

Use a local stack or a dedicated test project. Never load this scenario into production.

| Fixture | Suggested records |
| --- | --- |
| User A | One profile in UZS, Cash and Card payment methods, matching accounts, one private `lunch` tag, and a custom category. |
| Spending note | Capture text `7000 somsa 4x`, with parser state `parsed`, one linked Food expense for UZS 7,000 and quantity 4, and a second note with no parse result. |
| Finance | A UZS income entry, one monthly overall budget, Food monthly and Transport weekly category budgets, one due and one future recurring rule, and an account adjustment. |
| Savings | One goal with a deposit and withdrawal contribution in the goal currency. |
| User B | Separate profile, method, tag, expense, folder, capture, and goal. Use it only to prove that User A cannot read, update, or delete User B's rows. |

Verify create/edit/soft-delete/restore, retry with stable IDs, offline queue replay, folder move, matching account/currency checks, tag ownership, parser revision guards, account balance derivation, and cross-user RLS. Reset the disposable database between runs so prior fixtures cannot make a test pass accidentally.

## Test fixture rules

- Use reserved synthetic UUIDs and addresses such as `oauth-test@example.com` only inside tests.
- Keep test rows in transactions that roll back, or create them in per-test browser contexts / disposable projects.
- Mock Google OAuth, token exchange, Gemini parse results, and Data API rows in browser tests. Do not send real emails or real user notes from CI.
- Any database test requiring service-role access must point at a dedicated disposable Supabase project or the local stack, never production.
- Use the same stable global category IDs as the migrations when fixtures need global categories. Custom fixture rows must set the test user's `user_id`.
- Keep fixtures representative of constraints: same-currency account relations, capture-linked expenses, separate amount and quantity, archived versus soft-deleted state, and cross-user RLS denials.

## Introducing persistent seed data

If local database seed data becomes necessary, add it to an explicit `supabase/seed.sql` and configure seed execution in `supabase/config.toml`. Seed only local/test projects; use deterministic IDs, make inserts safe to rerun, and avoid creating sign-in-capable Auth users unless the test specifically needs Auth. Prefer a dedicated test setup script for login-capable accounts.

Before adding a new production reference row, decide whether it belongs in a versioned migration or user-generated data. Do not use a local seed file to mutate hosted production data.
