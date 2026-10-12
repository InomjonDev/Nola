# Nola Spending Notes PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the active Nola PWA around natural-language spending captures that preserve their source text, create linked structured expenses through OpenRouter, and power the existing Insights and Settings areas.

**Architecture:** Keep expense rows as the financial source of truth and add spending captures that preserve input text, folder/tags, parse state, and an idempotent parse result. Extend the existing local-first app store and Supabase sync path, add an authenticated Next.js Route Handler for OpenRouter, then replace the Home/History presentation with a Notes-inspired spending workspace. Later structured-note and native-widget phases are excluded from this plan.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase Auth/Postgres/RLS, OpenRouter Chat Completions with JSON Schema output, Remix Icon, jsPDF with embedded Noto Sans fonts, Node's built-in test runner, and Playwright.

## Global Constraints

- The active app is the Next.js PWA; the Expo implementation is retained under `expo-retired/`.
- Store every capture's source text and link it to its generated expense records.
- `7000 somsa 4x` means a total expense of 7,000 UZS and quantity 4; do not multiply the amount by quantity.
- Automatically save valid parsed expenses and provide one Undo action for the complete capture.
- Insights sum structured expense rows exactly once; quantity never multiplies an amount.
- Keep OpenRouter credentials server-only; do not send historical transactions or log raw capture text.
- Before the first AI request, disclose model-provider processing and require explicit consent; the parse route checks the saved consent setting.
- Preserve existing transactions and all existing budgets, goals, accounts, recurring transactions, income, authentication, offline sync, localization, and account controls.
- Support English, Russian, and Uzbek; light, dark, and system appearance; keyboard and screen-reader use; and responsive mobile, tablet, and desktop layouts.
- Keep interactive targets at least 44px and respect mobile safe-area insets.
- Phase 2 structured notes and Phase 3 native widgets/system shortcuts require separate plans.

---

## File Map

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20261012220000_nola_spending_notes.sql` | Capture/folder tables, expense quantity/link columns, AI consent, parse quota, default `Other` category, indexes, and RLS. |
| `src/lib/types.ts` | Capture, folder, parsed item, consent, and sync types. |
| `src/lib/mappers.ts` | Convert capture/folder records to and from Supabase rows. |
| `src/lib/app-store.tsx` | Local-first hydration, merge, capture/folder actions, grouped undo, and pending parse lifecycle. |
| `src/lib/offline-sync.ts` | Parent-before-child sync order for folders, captures, and expenses. |
| `src/lib/spending-captures.ts` | Pure capture totals and group undo transformations. |
| `src/lib/spending-parser.ts` | Pure prompt-output validation, quantity/amount rules, category mapping, hashtag extraction, and OpenRouter schema. |
| `src/lib/spending-parse-service.ts` | Server-only auth, consent, quota, OpenRouter call, parse-result caching, and error mapping. |
| `src/app/api/spending-captures/parse/route.ts` | Authenticated POST boundary for text parsing. |
| `src/components/spending/` | Focused capture list, folder navigation, search, editor/detail, and AI disclosure components. |
| `src/components/nola-app.tsx` | Existing application shell and route-to-view coordination. |
| `src/app/page.tsx`, `src/app/history/page.tsx`, `src/app/insights/page.tsx`, `src/app/settings/page.tsx` | Spending, search/history, Insights, and Settings entry routes. |
| `src/app/captures/[captureId]/page.tsx`, `src/app/folders/page.tsx`, `src/app/folders/[folderId]/page.tsx` | Capture detail, folder browser, and folder-filter routes. |
| `src/app/globals.css`, `src/theme/index.ts` | Notes-inspired light/dark surfaces, spacing, typography, and responsive behavior. |
| `src/lib/i18n.ts` | New capture, folder, search, parser, AI disclosure, and export strings in all supported languages. |
| `src/lib/export-data.ts`, `src/lib/export-pdf.ts` | JSON/CSV/Markdown/PDF generation. |
| `.env.example` | Document server-only OpenRouter model/key settings without secret values. |
| `tests/` | Parser, sync, search, export, RLS, and browser-flow coverage. |

## Task 1: Add the capture, folder, quantity, and consent data model

**Files:**

- Create: `supabase/migrations/20261012220000_nola_spending_notes.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/mappers.ts`
- Modify: `src/lib/constants.ts`
- Test: `tests/spending-capture-mappers.test.ts`
- Test: `tests/rls.integration.test.ts`

**Interfaces:**

- Add these exact domain shapes in `src/lib/types.ts`:

```ts
export type SpendingFolder = { id: string; userId: string; name: string; color: string; deletedAt: string | null; updatedAt: string };
export type CaptureParseStatus = "pending" | "processing" | "parsed" | "needs_retry" | "undone";
export type ParsedCaptureItem = { id: string; amount: number; currency: string; description: string; quantity: number | null; spentAt: string; categoryId: string; paymentMethodId: string; tagIds: string[] };
export type SpendingCapture = { id: string; userId: string; sourceText: string; capturedAt: string; folderId: string | null; tagIds: string[]; parseStatus: CaptureParseStatus; parseRevision: number; parsedRevision: number | null; parsedItems: ParsedCaptureItem[] | null; deletedAt: string | null; updatedAt: string };
```

- `Expense` gains `captureId: string | null` and `quantity: number | null`.
- `Profile` gains `aiParsingEnabled: boolean`, defaulting to `false` for existing and new users.
- `ParsedCaptureItem` contains server-generated `id`, positive `amount`, `currency`, `description`, `quantity`, `spentAt`, `categoryId`, `paymentMethodId`, and `tagIds`. The parser constrains `description` to 160 characters to match the existing expense `note` column. The client extracts hashtags from the original source, creates/resolves user tags through `ensureTags`, stores those IDs on the capture, and applies them to each generated expense; the model never invents tags.

- [ ] **Step 1: Write mapper coverage for a complete capture row**

Add `tests/spending-capture-mappers.test.ts` using the current Node test style:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { spendingCaptureRow, toSpendingCapture } from "../src/lib/mappers.ts";

test("maps a parsed spending capture without losing source text or parse results", () => {
  const capture = {
    id: "10000000-0000-4000-8000-000000000001",
    userId: "20000000-0000-4000-8000-000000000001",
    sourceText: "7000 somsa 4x #lunch",
    capturedAt: "2026-10-12T10:00:00.000Z",
    folderId: null,
    tagIds: ["30000000-0000-4000-8000-000000000001"],
    parseStatus: "parsed" as const,
    parseRevision: 1,
    parsedRevision: 1,
    parsedItems: [],
    deletedAt: null,
    updatedAt: "2026-10-12T10:00:02.000Z",
  };
  const row = spendingCaptureRow(capture);
  assert.equal(row.source_text, capture.sourceText);
  assert.equal(toSpendingCapture(row).sourceText, capture.sourceText);
  assert.equal(toSpendingCapture(row).parseStatus, "parsed");
  assert.equal(toSpendingCapture(row).parseRevision, 1);
});
```

- [ ] **Step 2: Run the new mapper test and confirm the missing exports fail**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/spending-capture-mappers.test.ts`
Expected: FAIL because the new mappers and types have not been added.

- [ ] **Step 3: Add the SQL tables, columns, and ownership policies**

The migration creates:

```sql
create table public.spending_folders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spending_captures (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_text text not null check (char_length(source_text) between 1 and 4000),
  captured_at timestamptz not null,
  folder_id uuid references public.spending_folders(id) on delete set null,
  tag_ids uuid[] not null default '{}',
  parse_status text not null check (parse_status in ('pending', 'processing', 'parsed', 'needs_retry', 'undone')),
  parse_revision integer not null default 1 check (parse_revision > 0),
  parsed_revision integer,
  parsed_items jsonb,
  deleted_at timestamptz,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses
  add column capture_id uuid references public.spending_captures(id) on delete set null,
  add column quantity numeric(12, 3) check (quantity is null or quantity > 0);

alter table public.profiles
  add column ai_parsing_enabled boolean not null default false;
```

Add owner-scoped select/insert/update/delete policies for captures and folders. Capture insert/update policies must require `folder_id` to be null or owned by `auth.uid()` and every `tag_id` to belong to `auth.uid()`. Extend expense insert/update policies so `capture_id` is null or owned by the same authenticated user. Enable RLS on both new tables and grant the authenticated role the same table operations used by existing synced entities. Add indexes on `(user_id, captured_at desc)`, `(user_id, folder_id)`, and a unique active folder-name index on `(user_id, lower(name)) where deleted_at is null`. Insert global category ID `00000000-0000-4000-8000-000000000006` as `Other`; add the same category to `GLOBAL_CATEGORIES` with the existing neutral color/icon conventions. Add a `spending_parse_attempts` table with RLS enabled and direct authenticated access revoked. Add an authenticated `consume_spending_parse_quota()` RPC that requires `auth.uid()`, acquires a per-user transaction advisory lock, prunes that user's timestamps older than 60 seconds, returns `false` at 10 active attempts, and inserts the current timestamp otherwise. Keep only user ID and timestamp; store no request content.

Use these owner predicates for capture policies, with insert/update `WITH CHECK` clauses also validating folder and tag ownership:

```sql
alter table public.spending_folders enable row level security;
alter table public.spending_captures enable row level security;

create policy spending_folders_select_own on public.spending_folders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy spending_folders_insert_own on public.spending_folders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy spending_folders_update_own on public.spending_folders
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy spending_folders_delete_own on public.spending_folders
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy spending_captures_select_own on public.spending_captures
  for select to authenticated using ((select auth.uid()) = user_id);
create policy spending_captures_insert_own on public.spending_captures
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (folder_id is null or exists (
      select 1 from public.spending_folders f where f.id = folder_id and f.user_id = (select auth.uid())
    ))
    and not exists (
      select 1 from unnest(tag_ids) requested_tag_id
      left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
      where t.id is null
    )
  );
create policy spending_captures_update_own on public.spending_captures
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (folder_id is null or exists (
      select 1 from public.spending_folders f where f.id = folder_id and f.user_id = (select auth.uid())
    ))
    and not exists (
      select 1 from unnest(tag_ids) requested_tag_id
      left join public.tags t on t.id = requested_tag_id and t.user_id = (select auth.uid())
      where t.id is null
    )
  );
create policy spending_captures_delete_own on public.spending_captures
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.spending_folders, public.spending_captures to authenticated;
```

For existing expense insert/update policies, add this ownership condition to their `WITH CHECK`: `capture_id is null or exists (select 1 from public.spending_captures c where c.id = capture_id and c.user_id = (select auth.uid()))`.

Implement the quota RPC with this transaction-locked rolling window:

```sql
create table public.spending_parse_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index spending_parse_attempts_user_time_idx on public.spending_parse_attempts (user_id, attempted_at desc);
alter table public.spending_parse_attempts enable row level security;
revoke all on public.spending_parse_attempts from anon, authenticated;

create function public.consume_spending_parse_quota()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  requesting_user uuid := auth.uid();
  active_count bigint;
begin
  if requesting_user is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtext(requesting_user::text));
  delete from public.spending_parse_attempts
    where user_id = requesting_user and attempted_at <= now() - interval '60 seconds';
  select count(*) into active_count from public.spending_parse_attempts
    where user_id = requesting_user and attempted_at > now() - interval '60 seconds';
  if active_count >= 10 then return false; end if;
  insert into public.spending_parse_attempts (user_id) values (requesting_user);
  return true;
end;
$$;
revoke all on function public.consume_spending_parse_quota() from public, anon;
grant execute on function public.consume_spending_parse_quota() to authenticated;
```

- [ ] **Step 4: Add TypeScript types and Supabase row mappers**

Define `SpendingFolder`, `SpendingCapture`, and `ParsedCaptureItem` exactly as listed under Interfaces. Add `toSpendingFolder`, `spendingFolderRow`, `toSpendingCapture`, and `spendingCaptureRow` in `src/lib/mappers.ts`. Map nullable database values to explicit `null`; map missing `profiles.ai_parsing_enabled` to `false`. Add capture and folder table names to `SyncOperation.table`.

- [ ] **Step 5: Verify type and mapper compatibility**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/spending-capture-mappers.test.ts`
Expected: PASS. Run: `npm run typecheck`
Expected: TypeScript exits with code 0.

- [ ] **Step 6: Commit the schema and type boundary**

```bash
git add supabase/migrations/20261012220000_nola_spending_notes.sql src/lib/types.ts src/lib/mappers.ts src/lib/constants.ts tests/spending-capture-mappers.test.ts tests/rls.integration.test.ts
git commit -m "feat: add spending capture data model"
```

## Task 2: Extend the local-first store and sync lifecycle

**Files:**

- Modify: `src/lib/app-store.tsx`
- Modify: `src/lib/offline-sync.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/offline-sync.test.ts`
- Test: `tests/spending-capture-store.test.ts`

**Interfaces:**

- Produces store methods `saveSpendingCapture`, `editCaptureSourceText`, `setCaptureParseResult`, `saveSpendingFolder`, `renameSpendingFolder`, `deleteSpendingFolder`, `moveCaptureToFolder`, and `undoSpendingCapture`.
- `captureTotal(expenses, captureId, currency)` sums active linked `amount` values in one currency and never multiplies by quantity.
- `undoCaptureData(state, captureId, deletedAt)` updates the capture and linked expense `deletedAt` fields while leaving unrelated expenses untouched.
- `editCaptureTextData(state, captureId, sourceText)` increments the capture's `parseRevision` and leaves existing expense rows active.
- `applyCaptureParseData(state, captureId, parseRevision, items)` rejects stale revisions and replaces linked expense rows only after the new complete result validates.
- `saveSpendingCapture(sourceText, folderId, tagIds)` returns the new capture ID and creates a local `pending` row before any network call.
- `editCaptureSourceText(captureId, sourceText)` increments `parseRevision` and retains currently linked expense rows until a new parse succeeds.
- `setCaptureParseResult(captureId, parseRevision, parsedItems)` accepts only the current revision, then atomically soft-deletes previous linked expenses and inserts the replacement set in local state.
- `undoSpendingCapture(captureId)` soft-deletes the capture and every active expense whose `captureId` matches.

- [ ] **Step 1: Add tests for group creation, totals, and undo behavior**

Add pure action helpers in `src/lib/spending-captures.ts` and cover these exact cases in `tests/spending-capture-store.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { applyCaptureParseData, captureTotal, editCaptureTextData, undoCaptureData } from "../src/lib/spending-captures.ts";

const captureId = "10000000-0000-4000-8000-000000000001";

test("capture total sums amounts once and ignores quantity", () => {
  const expenses = [
    { id: "e1", captureId, amount: 7000, currency: "UZS", quantity: 4, deletedAt: null },
    { id: "e2", captureId, amount: 1000, currency: "UZS", quantity: null, deletedAt: null },
  ];
  assert.equal(captureTotal(expenses, captureId, "UZS"), 8000);
});

test("undoing a capture deletes the capture and all linked expenses", () => {
  const data = {
    spendingCaptures: [{ id: captureId, deletedAt: null }],
    expenses: [
      { id: "e1", captureId, deletedAt: null },
      { id: "e2", captureId, deletedAt: null },
      { id: "legacy", captureId: null, deletedAt: null },
    ],
  };
  const next = undoCaptureData(data, captureId, "2026-10-12T10:00:00.000Z");
  assert.equal(next.spendingCaptures[0].deletedAt, "2026-10-12T10:00:00.000Z");
  assert.deepEqual(next.expenses.map((item) => item.deletedAt), ["2026-10-12T10:00:00.000Z", "2026-10-12T10:00:00.000Z", null]);
});

test("source edits advance the parse revision and retain old expenses until replacement succeeds", () => {
  const stateWithParsedCapture = {
    spendingCaptures: [{ id: captureId, sourceText: "7000 somsa 4x", parseStatus: "parsed", parseRevision: 1, parsedRevision: 1, deletedAt: null }],
    expenses: [{ id: "e1", captureId, amount: 7000, currency: "UZS", quantity: 4, deletedAt: null }],
  };
  const replacementItems = [{ id: "e2", amount: 8500, currency: "UZS", description: "somsa and tea", quantity: null, spentAt: "2026-10-12T00:00:00.000Z", categoryId: "food", paymentMethodId: "cash", tagIds: [] }];
  const edited = editCaptureTextData(stateWithParsedCapture, captureId, "7000 somsa 4x #lunch\n1500 choy");
  assert.equal(edited.spendingCaptures[0].parseRevision, 2);
  assert.equal(edited.expenses[0].deletedAt, null);
  const replaced = applyCaptureParseData(edited, captureId, 2, replacementItems);
  assert.equal(replaced.spendingCaptures[0].parsedRevision, 2);
  assert.equal(replaced.expenses.filter((item) => item.captureId === captureId && !item.deletedAt).length, 2);
});
```

- [ ] **Step 2: Run the focused action test and confirm it fails**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/spending-capture-store.test.ts`
Expected: FAIL until the capture action helper exists.

- [ ] **Step 3: Extend persisted app data with backward-compatible defaults**

Update `createInitialData`, account hydration, and remote pull in `src/lib/app-store.tsx` so old local data loads with `spendingCaptures: []` and `spendingFolders: []`. Read `spending_captures` and `spending_folders` from Supabase using the existing owner filters, map them through the new mappers, and merge by `updatedAt`. Preserve uncaptured legacy expenses as standalone rows.

- [ ] **Step 4: Add capture and folder store actions**

Implement the declared store methods. Every capture/folder mutation updates `currentDataRef`, local state, and the existing sync queue. `editCaptureSourceText` increments `parseRevision`, marks the capture pending, and leaves current expense rows visible. `setCaptureParseResult` rejects results for deleted, missing, or stale-revision captures, soft-deletes the previous linked rows, inserts the new rows in one state update, sets `parsedRevision`, and queues the capture before linked expenses. `deleteSpendingFolder` moves active captures to All Spending before soft-deleting the folder. `undoSpendingCapture` uses the existing soft-delete pattern and makes a late parser response a no-op.

- [ ] **Step 5: Add sync dependency ordering**

In `src/lib/offline-sync.ts`, order tables as profiles/categories/payment methods/tags first, folders second, captures third, and expenses fourth. Extend the exhaustive `Record<SyncOperation["table"], number>` so TypeScript forces an order for every table.

- [ ] **Step 6: Verify sync and local migration behavior**

Add assertions that a folder upsert precedes its capture and a capture precedes its expenses; add assertions that an unknown capture ID is ignored and a late response cannot restore an undone capture. Run the focused tests and `npm run typecheck`; both must pass.

- [ ] **Step 7: Commit the local-first lifecycle**

```bash
git add src/lib/app-store.tsx src/lib/offline-sync.ts src/lib/spending-captures.ts src/lib/types.ts tests/offline-sync.test.ts tests/spending-capture-store.test.ts
git commit -m "feat: sync spending captures locally"
```

## Task 3: Implement the parser and authenticated OpenRouter route

**Files:**

- Create: `src/lib/spending-parser.ts`
- Create: `src/lib/spending-parse-service.ts`
- Create: `src/lib/supabase-server.ts`
- Create: `src/app/api/spending-captures/parse/route.ts`
- Modify: `.env.example`
- Test: `tests/spending-parser.test.ts`
- Test: `tests/spending-parse-service.test.ts`
- Test: `tests/e2e/spending-capture-api.spec.ts`

**Interfaces:**

- `validateParsedItems(raw: unknown, context: ParseContext): ParsedCaptureItem[]` validates the whole model response or throws a typed parse error.
- `parseSpendingCapture(input: ParseRequest, deps?: ParseDependencies): Promise<ParsedCaptureItem[]>` calls OpenRouter and is injectable for API tests.
- `createSpendingParseHandler(deps: ParseDependencies)` returns the testable `POST` handler used by the Next route.
- `POST /api/spending-captures/parse` accepts `{ captureId, parseRevision, sourceText, localDate, timeZone }` plus an authenticated bearer token and returns `{ captureId, parseRevision, items }`.
- The server route verifies the user, checks `profiles.ai_parsing_enabled`, calls `consume_spending_parse_quota()`, and reads only that user's profile, categories, and payment methods.

- [ ] **Step 1: Define parser tests for amount, quantity, date, fallback category, and failure cases**

Add `tests/spending-parser.test.ts` with at least these assertions:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { validateParsedItems } from "../src/lib/spending-parser.ts";

const context = {
  profileCurrency: "UZS",
  localDate: "2026-10-12",
  timeZone: "Asia/Tashkent",
  defaultPaymentMethodId: "cash-id",
  categories: [{ id: "food-id", name: "Food" }, { id: "other-id", name: "Other" }],
  paymentMethods: [{ id: "cash-id", name: "Cash" }],
};

test("keeps total amount separate from quantity", () => {
  const [item] = validateParsedItems({ items: [{ amount: 7000, currency: "UZS", description: "somsa", quantity: 4, date: null, category: "Food", paymentMethod: null }] }, context);
  assert.equal(item.amount, 7000);
  assert.equal(item.quantity, 4);
  assert.equal(item.currency, "UZS");
});

test("rejects the complete response when any item has an invalid amount", () => {
  assert.throws(() => validateParsedItems({ items: [
    { amount: 7000, currency: "UZS", description: "somsa", quantity: null, date: null, category: "Food", paymentMethod: null },
    { amount: -4, currency: "UZS", description: "tea", quantity: null, date: null, category: "Food", paymentMethod: null },
  ] }, context));
});
```

Add cases for profile-currency fallback, local-date fallback, `Other` category fallback, allowed payment-method mapping, and an empty/no-amount result. Test `extractHashtags` separately for case normalization and duplicate removal.

- [ ] **Step 2: Run the parser tests and confirm they fail**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/spending-parser.test.ts`
Expected: FAIL because the parser module does not exist.

- [ ] **Step 3: Build strict parsing and normalization helpers**

`src/lib/spending-parser.ts` exports these types and functions:

```ts
export type ParseContext = {
  profileCurrency: string;
  localDate: string;
  timeZone: string;
  defaultPaymentMethodId: string;
  categories: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
};

export type ParseRequest = { captureId: string; parseRevision: number; sourceText: string; localDate: string; timeZone: string };
export type ParseDependencies = {
  authenticate(accessToken: string): Promise<{ userId: string } | null>;
  readCapture(userId: string, captureId: string): Promise<SpendingCapture | null>;
  writeCapture(userId: string, capture: SpendingCapture): Promise<void>;
  readParseContext(userId: string, localDate: string, timeZone: string): Promise<ParseContext>;
  consumeQuota(userId: string): Promise<boolean>;
  requestOpenRouter(body: Record<string, unknown>): Promise<unknown>;
  createId(): string;
  now(): string;
};

export function extractHashtags(sourceText: string): string[];
export function validateParsedItems(raw: unknown, context: ParseContext): ParsedCaptureItem[];
export function openRouterBody(sourceText: string, context: ParseContext, model: string): Record<string, unknown>;
export function createSpendingParseHandler(deps: ParseDependencies): (request: Request) => Promise<Response>;
```

The JSON Schema requires `items`, `amount`, `currency`, `description`, `quantity`, `date`, `category`, and `paymentMethod`, with `additionalProperties: false` and `strict: true`. `currency`, `quantity`, `date`, and `paymentMethod` may be `null`; `description` is limited to 160 characters. The server maps description to the existing expense `note` field, applies the profile currency and local date defaults, maps categories/payment methods to owned IDs, uses the default payment method when `paymentMethod` is `null`, and maps an unmapped category to global `Other`. Hashtags are extracted from the user's source text on the client and never included in the model response schema. `setCaptureParseResult` applies the capture's resolved `tagIds` to every generated expense. Reject the entire result if any item violates amount, quantity, date, currency, category, payment method, or item-count limits.

- [ ] **Step 4: Add the OpenRouter service with stable parse-result caching**

Use server-only `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Send a direct POST to `https://openrouter.ai/api/v1/chat/completions` with `response_format.type = "json_schema"`, `json_schema.strict = true`, and provider `require_parameters: true`. Use a 4,000-character input cap and a 25-item output cap. If no capture row exists yet, upsert a minimal row with the authenticated `user_id`, capture ID, source text, parse revision, local capture time, empty folder, and empty tag IDs; the later local-first sync upsert supplies folder and tags after their parent rows sync. The server stores the validated result and its generated expense IDs in `spending_captures.parsed_items` with `parsed_revision`. A cached result is valid only when its revision matches the request and source text matches the row. Store only operational status in parse-attempt records, never source text.

- [ ] **Step 5: Add auth, consent, quota, and failure handling to the route**

Create a request-scoped Supabase client in `src/lib/supabase-server.ts` using `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the request's bearer token. Call `auth.getUser(token)` before reading or writing owner data. Do not use `SUPABASE_SERVICE_ROLE_KEY`. Return 401 for missing/invalid sessions, 403 when consent is disabled, 409 for stale revision/source conflicts, 413 for text over 4,000 characters, 429 for quota exhaustion, 503 when OpenRouter environment values are absent, and 502 for provider/schema errors. On provider failures, set the capture to `needs_retry` and keep its source text.

Before calling OpenRouter, select the capture by `(id, user_id)`. Return cached items only when `parsed_revision = request.parseRevision` and the stored source text matches. Return 409 when the request revision is older than the stored revision or when the text differs at the same revision. For a newer user-owned revision, update source text/revision and set status to `processing` while retaining the previous parsed items until the new result validates. If no row exists, create the minimal capture described in Step 4 with `folder_id = null` and `tag_ids = '{}'`; never accept a different owner ID from the client. On success, replace `parsed_items` and set `parsed_revision` to the request revision.

The route uses the Next.js 15 `src/app/api/.../route.ts` convention and exports a `POST` function. Do not opt into static caching.

- [ ] **Step 6: Document the server variables and validate mocked provider behavior**

Add only these empty names and descriptions to `.env.example`:

```dotenv
# Server-only OpenRouter parsing. Never prefix these with NEXT_PUBLIC_.
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

Add `tests/spending-parse-service.test.ts` for injected auth/profile/quota/provider dependencies; verify success, 401, 403, 429, provider failure, invalid schema, cached retry, and source-text mismatch rejection without a real OpenRouter call. Add `tests/e2e/spending-capture-api.spec.ts` to intercept the same-origin request and verify the UI shows correct states. Run both focused test files, parser tests, and `npm run typecheck`; expected result is PASS/exit code 0. Follow the [Next.js 15 Route Handler convention](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware) and [OpenRouter structured-output requirements](https://openrouter.ai/docs/guides/features/structured-outputs).

- [ ] **Step 7: Commit the parser boundary**

```bash
git add src/lib/spending-parser.ts src/lib/spending-parse-service.ts src/lib/supabase-server.ts src/app/api/spending-captures/parse/route.ts .env.example tests/spending-parser.test.ts tests/spending-parse-service.test.ts tests/e2e/spending-capture-api.spec.ts
git commit -m "feat: parse spending captures with OpenRouter"
```

## Task 4: Add AI consent, composer, pending parse, and Undo

**Files:**

- Create: `src/components/spending/capture-composer.tsx`
- Create: `src/components/spending/ai-processing-notice.tsx`
- Create: `src/components/spending/use-pending-capture-parser.ts`
- Modify: `src/lib/app-store.tsx`
- Modify: `src/components/nola-app.tsx`
- Modify: `src/lib/i18n.ts`
- Test: `tests/e2e/spending-capture-composer.spec.ts`

**Interfaces:**

- `CaptureComposer({ folderId, onSaved, onClose })` accepts plain text and submits without requiring amount/category/payment forms.
- `usePendingCaptureParser()` processes local `pending` captures only when online and when `aiParsingEnabled` is true.
- `AiProcessingNotice({ open, onContinue, onNotNow })` records consent through the profile store and never submits the text on Not now.

- [ ] **Step 1: Add UI coverage for exact shorthand, consent, retry, and group Undo**

Create an authenticated E2E flow using `oauthSession()` plus mocked Supabase REST responses; the local demo identity has no valid bearer token for the protected parse route. Intercept the same-origin parser route. Fill the composer with `7000 somsa 4x`, return one parsed item, and assert that the note remains visible, the expense total is 7,000 UZS, the quantity is 4, and Undo removes both. Add cases for Not now sending zero parse requests, offline pending state, a 502 leaving text available to retry, and reparse replacing old linked rows only after a successful new revision.

- [ ] **Step 2: Run the E2E spec and confirm expected failures**

Run: `npx playwright test tests/e2e/spending-capture-composer.spec.ts`
Expected: FAIL until the composer, notice, and capture list are present.

- [ ] **Step 3: Implement the consent notice and settings-backed flag**

Use `Profile.aiParsingEnabled` as the cross-device consent source. The first attempted AI capture shows the notice. Continue calls the store update and then parses; Not now closes the notice and leaves text in the composer. The server enforces the same profile flag.

- [ ] **Step 4: Implement the plain-text composer and optimistic capture**

On submit, call `extractHashtags(sourceText)`, pass the results to `store.ensureTags()`, then call `saveSpendingCapture(sourceText, folderId, tagIds)` immediately. Close the editor and show an accessible processing row. Do not display category, payment, amount, or date fields in the initial capture flow. After a successful response, use `setCaptureParseResult()` to apply the capture's `tagIds` to every expense and show a live-region Undo toast. The toast's Undo calls `undoSpendingCapture(captureId)` and restores any previous focus.

- [ ] **Step 5: Implement pending/retry processing**

The hook reads only non-deleted `pending` captures, keeps one request in flight per capture/revision, reads the active Supabase access token, and calls the route with capture ID, parse revision, source text, local date, and time zone. If no authenticated session exists, keep the source text and explain that AI parsing requires sign-in. If a capture is undone or edited while a request is in flight, ignore the old response. Network errors preserve the source text and set `needs_retry`; reconnect and Retry offer the same capture ID and current revision.

- [ ] **Step 6: Run composer coverage and typecheck**

Run: `npx playwright test tests/e2e/spending-capture-composer.spec.ts` and `npm run typecheck`.
Expected: all composer flows pass and TypeScript exits with code 0.

- [ ] **Step 7: Commit the capture interaction**

```bash
git add src/components/spending/capture-composer.tsx src/components/spending/ai-processing-notice.tsx src/components/spending/use-pending-capture-parser.ts src/lib/app-store.tsx src/components/nola-app.tsx src/lib/i18n.ts tests/e2e/spending-capture-composer.spec.ts
git commit -m "feat: add natural-language spending capture"
```

## Task 5: Build the Notes-inspired spending workspace, folders, and search

**Files:**

- Create: `src/components/spending/capture-card.tsx`
- Create: `src/components/spending/capture-list.tsx`
- Create: `src/components/spending/folder-list.tsx`
- Create: `src/components/spending/capture-detail.tsx`
- Create: `src/components/spending/spending-search.tsx`
- Create: `src/lib/capture-search.ts`
- Create: `src/app/captures/[captureId]/page.tsx`
- Create: `src/app/folders/page.tsx`
- Create: `src/app/folders/[folderId]/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/history/page.tsx`
- Modify: `src/components/nola-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/theme/index.ts`
- Test: `tests/capture-search.test.ts`
- Test: `tests/e2e/spending-notes-navigation.spec.ts`

**Interfaces:**

- Keep `view="home"` as the internal key used by existing routes; change its visible destination label to Spending. Add `capture` and `folders` views with `captureId?: string` and `folderId?: string` props for the new routes.
- `CaptureCard({ capture, expenses, tags, currency, onOpen })` shows the source preview, total, item count, date, folder, and tags.
- `CaptureList({ captures, expenses, folderId, onOpen })` groups captures by local date and includes virtual standalone rows for legacy expenses.
- `CaptureDetail` edits preserved source text separately from linked expense rows and exposes an explicit Reparse action.
- `searchSpendingRecords(query, captures, expenses, categories, tags)` returns ordered capture and expense matches with highlight ranges.

- [ ] **Step 1: Write search tests for text, amount, date, category, and tag matches**

Create `tests/capture-search.test.ts` with fixtures for one capture, two linked expenses, and one legacy expense. Assert that `7000`, partial amount `70`, `2026-10-12`, `Food`, `somsa`, and `#lunch` find the expected capture/expense. Assert that a query never returns deleted records.

- [ ] **Step 2: Run search tests and confirm they fail**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/capture-search.test.ts`
Expected: FAIL until `searchSpendingRecords` is implemented.

- [ ] **Step 3: Implement pure search and result grouping**

Normalize localized number punctuation, ISO dates, category labels, source text, descriptions, and tag names. Return separate `capture` and `expense` result items, each with a stable key, display date, and `{ start, end }` highlight range. Search only active captures/expenses.

- [ ] **Step 4: Add folder and capture routes**

Add the pages using Next.js 15 App Router params typed as promises. `/captures/[captureId]` renders the preserved source text and its linked expense rows. Tapping an expense opens the existing edit flow and changes only the structured expense. Source edits call `editCaptureSourceText`; the explicit Reparse action submits the incremented revision. Keep previous linked expenses visible while the new revision is pending or fails; replace them only after the full new result validates. `/folders` renders built-in category views and user-created folders; `/folders/[folderId]` applies the selected folder filter. `/history?q=...` remains the search/history entry route and supports existing date/category filters.

- [ ] **Step 5: Replace the Home/History presentation with the spending workspace**

Update `View`, `navItems`, `DesktopNav`, `MobileNav`, and the route switch in `src/components/nola-app.tsx`. Keep the internal `home` key so `/onboarding` and `/add-expense` continue to resolve; show Spending as the visible label and render the new workspace at `/`. The primary add action and Insights add actions open `CaptureComposer`; keep `/add-expense` as the manual fallback when AI parsing is disabled. The first view groups capture rows by Today, Yesterday, Previous 7 Days, and older dates. Legacy expenses remain visible as standalone rows with their current note/category/date/amount. Search and compose sit in the bottom action area above mobile navigation.

- [ ] **Step 6: Apply the approved Notes visual system**

In `globals.css` and `theme/index.ts`, add cool pale light canvas, white rounded list rows, charcoal dark surfaces, warm gold action/highlight tokens, thin separators, and safe-area padding. Keep the existing platform system font stack. Add desktop folder/sidebar and optional detail-pane rules at the current responsive breakpoints; keep 44px minimum controls.

- [ ] **Step 7: Verify search, folders, routes, and responsive navigation**

Run the search unit test, `npx playwright test tests/e2e/spending-notes-navigation.spec.ts`, and `npm run typecheck`. The Playwright flow enters the demo, opens Spending, filters a folder, searches by amount and tag, opens a capture, and checks mobile and desktop navigation.

- [ ] **Step 8: Commit the spending workspace**

```bash
git add src/components/spending/capture-card.tsx src/components/spending/capture-list.tsx src/components/spending/folder-list.tsx src/components/spending/capture-detail.tsx src/components/spending/spending-search.tsx src/lib/capture-search.ts src/app/captures/[captureId]/page.tsx src/app/folders/page.tsx src/app/folders/[folderId]/page.tsx src/app/page.tsx src/app/history/page.tsx src/components/nola-app.tsx src/app/globals.css src/theme/index.ts tests/capture-search.test.ts tests/e2e/spending-notes-navigation.spec.ts
git commit -m "feat: redesign spending around notes"
```

## Task 6: Preserve Insights and add capture-aware CSV, Markdown, and PDF export

**Files:**

- Modify: `src/components/cash-flow.tsx`
- Modify: `src/components/nola-app.tsx`
- Modify: `src/lib/export-data.ts`
- Create: `src/lib/export-pdf.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `public/fonts/NotoSans-Regular.ttf`
- Create: `public/fonts/NotoSans-Bold.ttf`
- Create: `public/fonts/OFL.txt`
- Test: `tests/spending-exports.test.ts`
- Test: `tests/e2e/spending-export.spec.ts`

**Interfaces:**

- `exportNolaData(data, format)` supports `json | csv | markdown` and includes captures plus linked expenses without double-counting.
- `exportSpendingPdf(data, captureId?)` creates either one capture's report or an all-data report and downloads `nola-spending.pdf`.
- Insights reads only active structured expenses; capture totals are display helpers and are never added as separate aggregate expenses.

- [ ] **Step 1: Add export tests for source text, CSV safety, and unique totals**

Create tests that assert JSON includes captures and their expense links, CSV has one row per expense with `capture_id` and `quantity`, Markdown includes original source text and linked expense rows, and a capture total is not emitted as an additional transaction. Preserve the existing CSV formula-injection escaping behavior.

- [ ] **Step 2: Run export tests and confirm they fail**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/spending-exports.test.ts`
Expected: FAIL because Markdown/PDF and capture columns are absent.

- [ ] **Step 3: Extend JSON, CSV, and Markdown exports**

Update `exportNolaData` to include active captures/folders in JSON; add `capture_id` and `quantity` to CSV; implement `exportNolaMarkdown(data)` with one section per capture, source text, date, folder/tags, and linked structured rows. Keep existing JSON export intact.

- [ ] **Step 4: Add the PDF dependency and Unicode font assets**

Run: `npm install jspdf`. Add static Noto Sans regular and bold TTF files and their OFL license to the listed paths. Generate PDF client-side with a dynamic `import("jspdf")`; load each TTF as base64 and register it with `doc.addFileToVFS(...)` and `doc.addFont(...)` so Russian and Uzbek text renders. Wrap long source text, repeat headings after page breaks, and use tabular numbers for amounts. Follow the [jsPDF custom-font guidance](https://github.com/parallax/jsPDF#use-of-unicode-characters--utf-8).

- [ ] **Step 5: Add Settings export actions**

Add separate Export CSV, Export Markdown, and Export PDF rows. Keep JSON export. Build a single snapshot from the current app store, generate the selected format, and preserve the existing feedback/error state for unavailable exports.

- [ ] **Step 6: Verify Insights and exports**

Run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/spending-exports.test.ts`, `npx playwright test tests/e2e/spending-export.spec.ts`, and `npm run typecheck`. Verify a capture with two expense rows contributes exactly their two amounts to Insights and PDF/Markdown preserve Uzbek/Russian characters.

- [ ] **Step 7: Commit the export and Insights work**

```bash
git add src/components/cash-flow.tsx src/components/nola-app.tsx src/lib/export-data.ts src/lib/export-pdf.ts package.json package-lock.json public/fonts/NotoSans-Regular.ttf public/fonts/NotoSans-Bold.ttf public/fonts/OFL.txt tests/spending-exports.test.ts tests/e2e/spending-export.spec.ts
git commit -m "feat: export spending notes and expenses"
```

## Task 7: Complete settings, localization, accessibility, and PWA behavior

**Files:**

- Modify: `src/components/nola-app.tsx`
- Modify: `src/components/display-preferences.tsx`
- Modify: `src/lib/i18n.ts`
- Modify: `src/app/globals.css`
- Modify: `public/sw.js`
- Test: `tests/i18n.test.ts`
- Test: `tests/service-worker-cache.test.ts`
- Test: `tests/e2e/design-localization.spec.ts`
- Test: `tests/e2e/design-responsive.spec.ts`

**Interfaces:**

- Settings exposes the `aiParsingEnabled` profile flag with a clear explanation of external processing and a way to disable parsing.
- All visible new capture, folder, search, parsing, Undo, privacy, and export labels have English, Russian, and Uzbek translations.
- Search, compose, note detail, processing, errors, and Undo work with keyboard and screen readers.

- [ ] **Step 1: Add localization completeness assertions**

Extend `tests/i18n.test.ts` to enumerate the new keys and assert every key exists in English, Russian, and Uzbek. Include labels for All Spending, New spending note, Search, Processing, Retry, Undo, Folder, Other, AI disclosure, Continue, Not now, and the three added export formats.

- [ ] **Step 2: Add the AI setting and privacy copy**

Add the profile-backed toggle to Settings. Show the one-time disclosure before the first parse. Explain that only the entered capture text and minimal parsing context go to OpenRouter and the selected model provider. Continue persists consent; Not now preserves the text and makes no request. Disabling the setting blocks future calls in both client and server.

- [ ] **Step 3: Localize and audit all new visible text**

Add the exact message for every new UI state in each translation dictionary. Run the localization test and search `src/components/spending` for hard-coded user-facing strings; replace each hit with `t("...")`.

- [ ] **Step 4: Finish accessible and responsive states**

Add labels to icon-only controls, `aria-live="polite"` for parse/sync/Undo results, focus restoration after note/editor closure, visible focus rings, 44px controls, safe-area offsets, reduced-motion behavior, and input expansion above the virtual keyboard. Verify note cards and totals do not overlap at narrow widths.

- [ ] **Step 5: Keep private route and API responses out of service-worker caches**

Update `public/sw.js` to bypass `/api/` and authenticated capture/folder responses, preserving the existing rule that cross-origin financial/auth data is never cached. Add the new API path to `tests/service-worker-cache.test.ts`.

- [ ] **Step 6: Verify localization and responsive flows**

Run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/i18n.test.ts`, `npx playwright test tests/e2e/design-localization.spec.ts tests/e2e/design-responsive.spec.ts`, and `npm run typecheck`. Expected: all languages and viewport flows pass.

- [ ] **Step 7: Commit settings and quality behavior**

```bash
git add src/components/nola-app.tsx src/components/display-preferences.tsx src/lib/i18n.ts src/app/globals.css public/sw.js tests/i18n.test.ts tests/e2e/design-localization.spec.ts tests/e2e/design-responsive.spec.ts tests/service-worker-cache.test.ts
git commit -m "feat: finish spending notes settings and accessibility"
```

## Task 8: Run the Phase 1 acceptance and production checks

**Files:**

- Modify: `README.md`
- Modify: `docs/next-pwa-deployment.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/third-party-audit.md`
- Modify: `tests/rls.integration.test.ts`
- Modify: `tests/e2e/spending-capture-api.spec.ts`

**Interfaces:**

- Deployment setup documents `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` as server-only values and states that the configured provider's data policy must be reviewed.
- Release checklist records the Phase 1 capture, privacy, export, offline, RLS, and localization checks.
- Phase 2 structured notes and Phase 3 native widgets stay documented as follow-up projects, not hidden incomplete tasks in this plan.

- [ ] **Step 1: Add RLS coverage for captures, folders, and quota RPC**

Extend `tests/rls.integration.test.ts` so two authenticated users cannot read/update each other's folders/captures or consume another user's quota; verify expense RLS still accepts only the capture owner, valid categories, payment methods, and tags. Add an account-deletion case that confirms auth-user cascade deletion removes captures/folders and leaves no linked source text.

- [ ] **Step 2: Run focused and full quality commands**

Run, in order:

```bash
npm run typecheck
npm run lint
npm test
npx playwright test
npm run build
```

Expected: each command exits with code 0. When a Supabase test database is configured, also run `npm run test:rls`; expected result is PASS for the new owner policies and quota RPC.

- [ ] **Step 3: Verify the exact approved capture example in the browser**

At mobile width, enter `7000 somsa 4x`, let the mocked/model response resolve, and verify one 7,000 UZS expense with quantity 4, preserved source text, correct tag/category, and Undo. Reload and confirm capture plus expense persist. Disconnect before creating a second capture, reconnect, and verify one parse and one saved expense set.

- [ ] **Step 4: Update deployment and release documentation**

Document the server variables without adding actual secrets, the approved model's JSON Schema compatibility requirement, AI disclosure behavior, no-history request boundary, export formats, migration order, and separate later phases.

- [ ] **Step 5: Commit the completed Phase 1 documentation and integration coverage**

```bash
git add README.md docs/next-pwa-deployment.md docs/release-checklist.md docs/third-party-audit.md tests/rls.integration.test.ts tests/e2e/spending-capture-api.spec.ts
git commit -m "docs: document Nola spending notes release checks"
```

## Phase 1 Self-Review

- Source text and linked expenses are covered by Tasks 1-5; existing expenses remain standalone and are tested in Task 5.
- OpenRouter schema parsing, exact quantity semantics, allowed-category mapping, consent, auth, quota, errors, and retry caching are covered by Tasks 1, 3, 4, and 8.
- Folder/tags, search by text/amount/date/category, Notes-style list/detail, responsive layout, and dark/light appearance are covered by Tasks 5 and 7.
- Insights and CSV/Markdown/PDF/JSON export behavior is covered by Task 6.
- RLS, service-worker cache boundaries, localization, accessibility, offline retry, duplicate protection, Undo, account data preservation, and release checks are covered by Tasks 1-8.
- Checklists, inline tables, OCR, arithmetic blocks, widgets, and native shortcuts are intentionally reserved for separate Phase 2/3 plans.
