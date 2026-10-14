# Row-level security policies

This is the policy map for the schema currently represented by `supabase/migrations/`. Read policy definitions in the migrations as the executable source of truth. All listed `public` data tables have RLS enabled; app Data API access is granted to `authenticated`, not `anon`. The client uses a publishable key and the signed-in user's JWT. The `service_role` key bypasses RLS and must stay server-side.

## Row access matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `profiles` | `id = auth.uid()` | Own `id`; a default payment method must belong to that user | Same owner and default-method check in `USING` and `WITH CHECK` | Own `id` |
| `payment_methods` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `categories` | All `global` rows plus own rows | Own `custom` categories only | Own `custom` row only | Own `custom` row only |
| `tags` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `expenses` | Own `user_id` | Own row plus related-record checks below | Same checks in `USING` and `WITH CHECK` | Own row |
| `income_entries` | Own `user_id` | Own row; optional account/rule checks below | Same checks in `USING` and `WITH CHECK` | Own row |
| `budgets` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `push_subscriptions` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `reminder_preferences` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `savings_goals` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `goal_contributions` | Own `user_id` | Own `user_id`, with composite goal/owner/currency FK | Own row; immutable financial identity fields are additionally trigger-protected | Own row |
| `spending_folders` | Own `user_id` | Own `user_id` | Own row; ownership remains unchanged | Own row |
| `spending_captures` | Own `user_id` | Own row; folder and tags must be owned by the same user | Same checks in `USING` and `WITH CHECK` | Own row |
| `spending_parse_attempts` | No direct role access | No direct role access | No direct role access | No direct role access |
| `accounts` | Own `user_id` | Own row; matching own payment method with the same ID | Same checks in `USING` and `WITH CHECK` | Own row |
| `category_budgets` | Own `user_id` | Own row; category must be global or owned | Same checks in `USING` and `WITH CHECK` | Own row |
| `recurring_rules` | Own `user_id` | Own row plus optional account/category/method/tag checks and kind check | Same checks in `USING` and `WITH CHECK` | Own row |
| `account_adjustments` | Own `user_id` | Own row; account must be owned and currency must match | Same checks in `USING` and `WITH CHECK` | Own row |

“Own” means the policy compares `user_id` (or the profile's `id`) to `(select auth.uid())`. Update policies check both the old row (`USING`) and proposed row (`WITH CHECK`) to prevent changing ownership.

## Related-record checks

- An expense's category must be global or owned by its user; its payment method must be owned by that user; each UUID in `tag_ids` must resolve to that user's tag. Optional `capture_id` must resolve to that user's capture. Optional `recurring_rule_id` must resolve to that user's expense rule and use the same currency.
- An income entry's optional account must be owned by the user and use the same currency. Its optional recurring rule must be owned by the user, have `kind = 'income'`, and use the same currency.
- A capture's optional folder and every tag must be owned by the capture's user.
- A recurring rule's optional account must be owned by the rule's user and use the rule currency; category must be global or owned; payment method and tags must be owned. `kind = 'expense'` requires category and payment method; `kind = 'income'` requires both to be null.
- Account IDs equal their payment-method IDs. Goal contributions use a composite FK `(goal_id, user_id, currency)` to ensure their goal shares the same owner and currency.

## Privileged functions and internal tables

- `public.consume_spending_parse_quota()` is the only app entry point to the private `spending_parse_attempts` table. It requires `auth.uid()`, takes a per-user advisory lock, prunes attempts older than 24 hours, and allows at most 10 attempts per 60 seconds and 30 attempts per rolling 24 hours. Direct table privileges are revoked from `public`, `anon`, and `authenticated`; execution is granted to `authenticated`.
- `public.delete_own_account()` is `SECURITY DEFINER`, requires a non-null `auth.uid()`, and deletes only that Auth user. Execute is revoked from `public` and `anon`, and granted to `authenticated`.
- `public.keep_latest_client_write()` and `public.protect_goal_contribution()` are trigger functions. Direct execute is revoked; they are not application APIs.
- The `daily-reminders` Supabase Edge Function uses a server-side service-role key to read due reminders and send pushes. That key bypasses RLS and must never be used by browser code.

## Security invariants to preserve

1. Keep RLS enabled on every exposed table, including new tables.
2. Pair `TO authenticated` with an ownership predicate; authentication by itself is not row authorization.
3. For inserts, validate owner and every cross-table reference in `WITH CHECK` or a constraint.
4. For updates, keep the same owner predicate in both `USING` and `WITH CHECK`.
5. Do not make tags globally visible: UUID arrays do not provide foreign keys, so policies explicitly validate every referenced tag.
6. Global categories are readable to authenticated users and are not writable through user policies; custom categories are owner-scoped.
7. Test cross-user reads, inserts, updates, deletes, and FK ownership using separate authenticated subjects. The existing SQL checks are under `supabase/tests/`; run them only against a disposable local or test database.
