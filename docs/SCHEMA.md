# Supabase schema and field rules

This describes the current `public` schema as assembled from `supabase/migrations/`. SQL migrations are authoritative if this document drifts. Field names below use database `snake_case`.

## Shared conventions

- `id`: usually a UUID primary key generated with `gen_random_uuid()`. Exceptions are noted: `profiles.id` is the Auth user ID; `accounts.id` is the paired payment-method ID; spending folder/capture IDs are supplied by the client.
- `user_id`: UUID owner referencing `auth.users(id) ON DELETE CASCADE`, except where a table uses `profiles.id` or a composite relation instead.
- `created_at`, `updated_at`: `timestamptz NOT NULL DEFAULT now()` where listed. `updated_at` is set to `now()` by the shared trigger on updateable client-synced tables.
- `client_updated_at`: `timestamptz NOT NULL DEFAULT now()` on client-synced rows. `keep_latest_client_write()` rejects stale updates and refreshes `updated_at` for accepted ones.
- `currency`: usually `text NOT NULL CHECK (currency ~ '^[A-Z]{3}$')`; savings goals use a fixed supported-currency allowlist, and goal contributions inherit currency validity through their composite FK.
- `deleted_at` is a nullable soft-delete timestamp. `archived_at` hides or disables a still-retained record. These fields are distinct.
- `numeric(14,2)` stores money; `numeric(12,3)` stores expense quantity. Keep database decimal values exact when writing SQL; convert carefully in app code.

## Table fields

### `profiles`

| Field | Rule and meaning |
| --- | --- |
| `id` | UUID primary key and FK to `auth.users(id) ON DELETE CASCADE`; same identity as the signed-in user. |
| `currency` | Required, default `USD`, three uppercase letters. |
| `default_payment_method_id` | Nullable FK to `payment_methods(id) ON DELETE SET NULL`; RLS verifies it belongs to this profile owner. |
| `onboarding_completed` | Required boolean, default `false`. |
| `ai_parsing_enabled` | Required boolean, added in the spending-notes migration, default `false`; server parsing requires explicit true. |
| `created_at`, `updated_at` | Required timestamps, default `now()`. |

### `payment_methods`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. Also the primary key of its paired `accounts` row when that account exists. |
| `user_id` | Required Auth owner; cascade delete with the user. |
| `name` | Required text, 1–60 characters. |
| `archived_at` | Nullable timestamp; archived methods remain historical. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `categories`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key; global seed rows use fixed UUIDs. |
| `user_id` | Nullable Auth owner: null for global categories; required in practice for custom categories. |
| `name` | Required text, 1–60 characters. |
| `color` | Required `#RRGGBB`, case-insensitive hex. |
| `kind` | Required enum-like text: `global` or `custom`. |
| `icon` | Nullable text, 1–40 characters when present; added after the initial schema. App types restrict built-in icon names more than SQL does. |
| `archived_at` | Nullable; global categories must not be archived. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

`category_ownership` enforces `(global AND user_id IS NULL AND archived_at IS NULL) OR (custom AND user_id IS NOT NULL)`. `tags_user_name_unique` makes tag names unique case-insensitively per owner.

### `tags`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `name` | Required text, 1–40 characters. Unique per user without case sensitivity. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `expenses`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `amount` | Required `numeric(14,2)`, greater than zero. This is the record total, separate from quantity. |
| `currency` | Required three uppercase letters. |
| `spent_at` | Required `timestamptz`. |
| `category_id` | Required FK to `categories(id)`; RLS restricts it to global or same-owner category. |
| `payment_method_id` | Required FK to `payment_methods(id)`; RLS requires same owner. |
| `note` | Nullable text, maximum 160 characters. |
| `tag_ids` | Required `uuid[]`, default empty array. RLS validates every element; there is no array FK. |
| `capture_id` | Nullable FK to `spending_captures(id) ON DELETE SET NULL`; same-owner link is enforced by RLS. |
| `quantity` | Nullable `numeric(12,3)`, must be greater than zero when present. |
| `recurring_rule_id` | Nullable FK to `recurring_rules(id) ON DELETE SET NULL`; RLS requires same-owner expense rule and matching currency. |
| `deleted_at` | Nullable soft-delete timestamp. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `income_entries`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `amount` | Required `numeric(14,2)`, greater than zero. |
| `currency` | Required three uppercase letters. |
| `received_at` | Required `timestamptz`. |
| `note` | Nullable text, maximum 160 characters. |
| `account_id` | Nullable FK to `accounts(id) ON DELETE SET NULL`; RLS requires same owner and currency. |
| `recurring_rule_id` | Nullable FK to `recurring_rules(id) ON DELETE SET NULL`; RLS requires same-owner income rule and matching currency. |
| `deleted_at` | Nullable soft-delete timestamp. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `budgets`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `month` | Required text in `YYYY-MM`, month `01`–`12`. |
| `amount` | Required `numeric(14,2)`, greater than zero. |
| `currency` | Required three uppercase letters. |
| `deleted_at` | Nullable soft-delete timestamp. Active rows are unique per owner/month/currency. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `push_subscriptions`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `endpoint` | Required globally unique text, 1–2048 characters. Treat as a private endpoint. |
| `p256dh`, `auth` | Required Web Push key strings, each 1–256 characters. Treat as secrets. |
| `user_agent` | Nullable text captured from the subscribing browser. |
| `last_seen_at` | Required `timestamptz`, default `now()`. |
| `created_at`, `updated_at` | Required timestamps, default `now()`. |

### `reminder_preferences`

| Field | Rule and meaning |
| --- | --- |
| `user_id` | Primary key and FK to Auth user, cascade delete. |
| `enabled` | Required boolean, default `false`. |
| `timezone` | Required text, 1–80 characters, default `UTC`; expected to be an IANA timezone. |
| `local_time` | Required SQL `time`, default `20:00`. |
| `last_notified_on` | Nullable `date`, added for delivery idempotency; stores the local date last notified. |
| `updated_at` | Required timestamp, default `now()`. |

### `savings_goals`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `name` | Required text; trimmed length 1–80. |
| `target_amount` | Required `numeric(14,2)`, greater than zero. |
| `currency` | Required one of `USD`, `UZS`, `RUB`, `EUR`, `GBP`. |
| `icon` | Required; defaults to `wallet`; one of `wallet`, `plane`, `home`, `car`, `gift`, `briefcase`, `heart-pulse`, `shopping-bag`. |
| `deadline` | Nullable `date`. |
| `archived_at`, `deleted_at` | Nullable archive and soft-delete timestamps. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |
| `(id, user_id, currency)` | Unique composite key referenced by contributions. |

### `goal_contributions`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `goal_id`, `user_id`, `currency` | Composite FK to the same goal, owner, and currency; deletes cascade with the goal/user. |
| `amount` | Required `numeric(14,2)`, greater than zero. |
| `kind` | Required `deposit` or `withdrawal`. |
| `occurred_on` | Required `date`. |
| `note` | Nullable text, maximum 160 characters. |
| `deleted_at` | Nullable soft-delete timestamp. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`. |

The protect trigger rejects updates that change `id`, `goal_id`, `user_id`, `currency`, `amount`, `kind`, or `occurred_on`; note and soft-delete state can still change.

### `spending_folders`

| Field | Rule and meaning |
| --- | --- |
| `id` | Client-supplied UUID primary key; no database default. |
| `user_id` | Required Auth owner; cascade delete. |
| `name` | Required text, 1–60 characters. Active names are case-insensitively unique per user. |
| `color` | Required `#RRGGBB`, case-insensitive hex. |
| `deleted_at` | Nullable soft-delete timestamp; unique active-folder index excludes deleted rows. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `spending_captures`

| Field | Rule and meaning |
| --- | --- |
| `id` | Client-supplied UUID primary key; no database default. |
| `user_id` | Required Auth owner; cascade delete. |
| `source_text` | Required text, 1–4000 characters; the user's original spending note. |
| `captured_at` | Required `timestamptz`. |
| `folder_id` | Nullable FK to `spending_folders(id) ON DELETE SET NULL`; RLS requires same owner. |
| `tag_ids` | Required `uuid[]`, default empty; RLS validates each tag owner. |
| `parse_status` | Required `pending`, `processing`, `parsed`, `needs_retry`, or `undone`. |
| `parse_revision` | Required integer greater than zero, default `1`; guards stale parser work. |
| `parsed_revision` | Nullable integer identifying the source revision represented by `parsed_items`. |
| `parsed_items` | Nullable `jsonb` parser snapshot. Structured expenses are separately stored in `expenses`. |
| `deleted_at` | Nullable soft-delete timestamp. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `spending_parse_attempts`

| Field | Rule and meaning |
| --- | --- |
| `user_id` | Required FK to Auth user, cascade delete. |
| `attempted_at` | Required `timestamptz`, default `now()`. |

This internal quota table has no client grants. Users reach it only through `consume_spending_parse_quota()`.

### `accounts`

| Field | Rule and meaning |
| --- | --- |
| `id` | Primary key and FK to `payment_methods(id) ON DELETE CASCADE`; an account and its payment method share an ID. |
| `user_id` | Required Auth owner; cascade delete. |
| `name` | Required trimmed length 1–60. |
| `kind` | Required `cash`, `bank`, or `card`. |
| `currency` | Required three uppercase letters. |
| `starting_balance` | Required `numeric(14,2)`, zero or greater. |
| `archived_at`, `deleted_at` | Nullable archive and soft-delete timestamps. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |
| `(id, user_id, currency)` | Unique composite key referenced by account adjustments. |

### `category_budgets`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `category_id` | Required FK to category; RLS allows global or same-owner custom categories. |
| `amount` | Required `numeric(14,2)`, greater than zero. |
| `currency` | Required three uppercase letters. |
| `cadence` | Required `weekly` or `monthly`. |
| `deleted_at` | Nullable soft-delete timestamp; one active row per owner/category/currency/cadence. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

### `recurring_rules`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `user_id` | Required Auth owner; cascade delete. |
| `kind` | Required `expense` or `income`. |
| `amount` | Required `numeric(14,2)`, greater than zero. |
| `currency` | Required three uppercase letters. |
| `account_id` | Nullable FK to `accounts(id) ON DELETE SET NULL`; RLS checks owner and currency. |
| `category_id` | Nullable category FK. Expense rules require it; income rules require null. |
| `payment_method_id` | Nullable payment-method FK. Expense rules require it; income rules require null. |
| `note` | Nullable text, maximum 160 characters. |
| `tag_ids` | Required `uuid[]`, default empty; RLS checks every tag belongs to the owner. |
| `frequency` | Required `weekly` or `monthly`. |
| `start_date`, `next_run_date` | Required SQL dates. `next_run_date` is the next client generation date. |
| `archived_at`, `deleted_at` | Nullable archive and soft-delete timestamps. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |
| `(id, user_id, currency)` | Unique composite key used to validate generated rows. |

### `account_adjustments`

| Field | Rule and meaning |
| --- | --- |
| `id` | Generated UUID primary key. |
| `account_id`, `user_id`, `currency` | Required composite FK to an account with the same owner and currency; delete cascades. |
| `amount` | Required `numeric(14,2)`, nonzero; positive or negative reconciliation amount. |
| `occurred_on` | Required SQL `date`. |
| `note` | Nullable text, maximum 160 characters. |
| `deleted_at` | Nullable soft-delete timestamp. |
| `client_updated_at`, `created_at`, `updated_at` | Required timestamps, default `now()`; latest-client-write trigger applies. |

## Index and trigger rules

Partial indexes for expenses, income, recurring rules, adjustments, and captures target the app's active/owner/date lookups. Unique active indexes ignore soft-deleted rows for budgets and folders. The migrations also add tag case-insensitive uniqueness and account/currency composite keys.

Most client-synced mutable tables use `keep_latest_client_write()`. `goal_contributions` additionally use `protect_goal_contribution()` so a retry can upsert an identical event but cannot rewrite the financial event identity.
