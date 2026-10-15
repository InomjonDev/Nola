# Nola spending-notes redesign

Date: 2026-10-12  
Status: Design approved section by section; awaiting review of this written specification.

## Goal

Redesign Nola as a calm, Apple Notes-inspired expense tracker. People record spending in their own words. Nola preserves that source text, uses OpenRouter to extract structured expenses, and feeds those records into the existing spending, Insights, and Settings experience.

This design uses the supplied Apple Notes screenshots as visual references. It retains Nola's identity and does not copy Apple Notes branding or artwork.

## Confirmed product decisions

- Nola is a notes-like product whose core work remains spending, Insights, and Settings.
- Each typed spending capture keeps its original text and links to one or more structured expense records.
- Initial capture uses natural language; people do not have to complete an expense form.
- OpenRouter analyzes the text and saves valid expense records automatically. A brief Undo action reverses the whole capture.
- `7000 somsa 4x` means a total expense of 7,000 UZS for 4 somsas. The amount is not multiplied by the quantity.
- The initial redesign targets the active Next.js PWA. Native widgets and system shortcuts are a later native-app project.
- The latest Notes references replace the October 6 flat-only visual direction for this redesign.

## Current project context

The active app is a Next.js 15 PWA with a React client, a local-first app store, Supabase Auth/Postgres/RLS, and English, Russian, and Uzbek localization. The PWA is the single maintained application target.

The current expense model stores a structured amount, date, category, payment method, note, and tags. The store also contains budgets, category budgets, recurring rules, accounts, income, savings goals, and goal contributions. Existing transactions and account behavior must remain available.

## Phase 1 scope

Phase 1 establishes the notes-style PWA and spending-capture foundation:

- Spending list grouped by date, with note previews, linked expense count, total, and tags.
- Built-in and user folders, hashtag organization, and global search across note text and structured expense fields.
- Plain-language capture, OpenRouter extraction, optional quantity, local-first persistence, retry, and group Undo.
- Expense totals on captures and in Insights. Structured expense rows remain the source for financial aggregation.
- Existing budgets, goals, accounts, recurring transactions, income, profile, authentication, localization, offline sync, and account controls remain accessible.
- CSV, Markdown, and PDF export, while retaining existing JSON export where present.
- Light, dark, and system appearance settings, responsive layouts, keyboard and screen-reader support.

The Phase 1 editor keeps the input focused on plain text. It shows linked expense rows after parsing. Editing an expense changes its structured record. Editing the source text does not silently rewrite existing transactions; a deliberate reparse replaces the capture's linked result set.

## Later phases

| Phase | Capabilities |
| --- | --- |
| 2: structured spending notes | Checklists with paid and remaining totals; inline recurring-bill tables; arithmetic expressions and table column sums; receipt and screenshot attachments with amount OCR. |
| 3: native quick entry | Home and Lock Screen widgets, native quick-entry actions, system shortcuts, and supported Action Button integrations. This requires a native app target and is separate from the PWA core. |

Apple documents widgets through WidgetKit extensions and system actions through App Intents. References: [WidgetKit](https://developer.apple.com/documentation/widgetkit), [App Intents](https://developer.apple.com/documentation/appintents/app-intents).

## Information architecture and visual design

### Mobile

- **Spending** is the first destination. It groups capture notes under Today, Yesterday, Previous 7 Days, and older dates.
- A folder control opens All Spending, built-in category views, and user-created folders.
- A search control and compose action remain easy to reach at the bottom of the spending screen. The compose action opens a plain-text editor.
- **Insights** and **Settings** remain first-level destinations. Profile, appearance, language, export, privacy, and account actions live in Settings.
- A capture detail view displays the preserved source text and its linked structured expenses together.

### Search

Search matches capture text, descriptions, amount values, dates, categories, and tags. Results group note/capture matches and expense matches, show a result count, and highlight the matching text. Search accepts natural-language text, exact or partial amounts, dates, and hashtags.

### Desktop

Use a persistent navigation and folder sidebar, a centered capture list, and an optional detail pane for the selected capture. Keep the expense content readable at wide widths and keep the core mobile flow intact.

### Visual system

- Use system sans-serif typography, large readable folder/list headings, restrained secondary text, and generous spacing.
- Light mode uses a cool, pale neutral canvas with white rounded note rows and fine separators.
- Dark mode uses charcoal surfaces with high-contrast text and matching separators.
- Use a restrained warm gold accent for selected actions, folder marks, and search highlights. Keep category colors small and purposeful.
- Adapt safe-area insets and keep interactive targets at least 44px.
- Use the existing Nola brand assets and icon family where they fit the new direction.
- Keep the screen hierarchy and spacing responsive for English, Russian, and Uzbek text.

## Capture and AI data flow

1. The user opens a plain-text composer and types one or more spending descriptions.
2. Nola writes a local capture record first with the source text, capture ID, timestamp, folder/tags, and parse status.
3. When online, the authenticated PWA sends the new source text and minimal interpretation context to a Next.js server route. Context may include the user's default currency, local date, available category names, and default payment method. Do not send the user's historical transaction list.
4. The route calls OpenRouter with a server-side API key and a configured model that supports JSON Schema output. The route validates the response against an application schema and maps allowed category/payment names to local IDs.
5. A valid result creates linked structured expense rows in local-first state and queues their sync. A capture ID makes retries idempotent.
6. Nola shows the saved capture and an accessible Undo action. Undo removes the capture and all expenses generated from it, and syncs that removal.
7. If the device is offline, the source text remains locally queued for parsing after reconnection. If the API is unavailable or the response is invalid, Nola retains the source text with a retry state and creates no partial or fabricated expenses.

OpenRouter documents JSON Schema structured outputs for compatible models. Model support must be checked when selecting the Phase 1 model. [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)

### Parsed expense fields

Each parsed item contains:

- `amount`: positive total paid for that item.
- `currency`: explicit currency if present; otherwise the profile currency.
- `description`: item or merchant wording suitable for an expense row.
- `quantity`: optional positive quantity, stored separately from total amount.
- `spentAt`: explicit date when present; otherwise the user's local capture date.
- `category`: an allowed category key that Nola maps to the user's category ID.
- `paymentMethod`: explicit method when present; otherwise the user's default method.
- `tags`: hashtags present in the source text, mapped to the user's tags.

The Phase 1 description is stored in the current expense `note` field. When a category cannot be mapped confidently, Nola uses a system `Other` category instead of inventing a match. Hashtags are extracted from the source text, normalized, and resolved to the user's tags; missing hashtag tags are created for that user.

The original source text remains on the capture record. Insights sum the structured `amount` values exactly once; quantity never multiplies an amount. A capture with no valid amount remains a saved text capture with a retry/edit action and no fabricated transaction.

For `7000 somsa 4x`, the parser output is one expense with `amount: 7000`, `currency: UZS`, `description: somsa`, and `quantity: 4`. This example is a required parser acceptance case.

## Data and compatibility design

- Add a `spending_captures` entity with owner, source text, capture time, folder association, tags, parse status, and update metadata.
- Add nullable `capture_id` and `quantity` fields to expense records. Existing expenses remain valid when either field is null. The optional quantity is a positive decimal; the expense amount remains the total paid.
- Add a user-owned folder entity for custom folders. Built-in category views can be derived from existing categories rather than copied into duplicate folders.
- Extend persisted local data and the sync queue for captures/folders. Add Supabase migrations and RLS policies that enforce owner access.
- Existing expenses must not be dropped or assigned invented source text. Render legacy expenses as standalone items in the new list. Keep them included in Insights and all exports.
- Include capture source text, linked expenses, and folder/tag associations in exports and account deletion. CSV rows represent structured expense records; Markdown and PDF can include the original capture and its generated expenses.

## Privacy and security

- Before the first AI request, show a clear notice that the entered spending text is sent through OpenRouter to the selected model provider for parsing. The notice links to current provider data practices and offers Continue and Not now.
- Provide a setting to disable AI parsing. If disabled, retain the existing manual expense path and never send the capture text to OpenRouter.
- Keep the OpenRouter key in server-only environment configuration. Do not expose it to the browser or include it in client bundles.
- Authenticate the parse route, enforce per-user request and text-size limits, and validate all model fields against local constraints and allowlists.
- Do not log raw capture text or send account history to the model. Log only operational status and non-content diagnostics.
- Treat model output as untrusted input. Do not create expenses unless the full parsed result validates.

OpenRouter's current privacy policy says inputs are transmitted to the selected or automatically routed model provider and that provider practices vary. [OpenRouter privacy policy](https://openrouter.ai/privacy/)

## Error handling and recovery

- **Offline:** preserve capture locally as pending and retry parsing once connectivity returns.
- **Provider unavailable, rate limited, or missing server configuration:** preserve the source text, show a concise retry state, and keep the rest of the app usable.
- **No amount detected or invalid schema:** save no expense, retain the capture, and explain that Nola could not identify a valid amount.
- **Duplicate delivery or network retry:** use capture ID and idempotent writes so a retry cannot create duplicate expense rows.
- **Undo before parsing completes:** cancel or invalidate the pending operation so a late response cannot restore deleted data.
- **Sync failure after local save:** keep the local capture and linked expenses visible, report sync status, and use the existing retry mechanism.

## Acceptance and validation plan

The implementation plan should verify:

- `7000 somsa 4x` stores 7,000 UZS total and quantity 4.
- Multiple items create separate structured expense rows linked to one source capture.
- Default currency, local date, category mapping, payment method, hashtags, and explicit dates are applied as specified.
- Missing/invalid amounts and malformed model output preserve source text without creating false expenses.
- OpenRouter credentials stay server-side; unauthenticated users cannot parse; requests do not include transaction history.
- Online save, offline pending/retry, duplicate protection, group Undo, and cross-device sync preserve all records.
- Search finds source text, amount, date, description, category, and tag matches.
- Insights and exports count structured expenses once, preserve legacy expense data, and include capture context where appropriate.
- Light/dark/system modes, English/Russian/Uzbek, keyboard flow, screen readers, and mobile/tablet/desktop layouts remain usable.
- Existing account, budget, savings, recurring, income, export, and deletion behaviors remain accessible.

## Design review

- Scope separates the PWA core from structured-note and native-widget work.
- The confirmed amount/quantity example is explicit in both the data model and acceptance plan.
- The source text and generated expenses have a single linkage model; Insights aggregate structured rows only.
- Existing transactions remain readable without fabricated text or destructive migration.
- No placeholder sections or unresolved implementation choices remain in the Phase 1 design.
