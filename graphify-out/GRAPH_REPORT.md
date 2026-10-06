# Graph Report - .  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1360 nodes · 2767 edges · 124 communities (104 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4c198b4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useLedgerTheme
- app-store.tsx
- formatMoney
- types.ts
- scripts
- app-store.tsx
- savings-goals.tsx
- add-expense.tsx
- category-icon.tsx
- supabase.ts
- walletly-app.tsx
- settings.tsx
- expo
- expo
- radius
- WalletlyApp
- compilerOptions
- recurring.ts
- Design System Master File
- i18n-provider.tsx
- i18n.ts
- auth-tour.tsx
- auth-tour.tsx
- Walletly Rate Limits and Email-Link Expiry Design
- types.ts
- types.ts
- seo.ts
- InsightsView
- constants.ts
- Walletly Onboarding and Surface Redesign
- useAppStore
- _layout.tsx
- legal-page.tsx
- File Structure
- Baseline
- Walletly Email OTP Sign-In Design
- mappers.ts
- Walletly History, Icons, Theme, and Localization Design
- Walletly Magic-Link Authentication Design
- Language
- index.ts
- Page-Specific Rules
- Walletly
- Walletly Next.js PWA Deployment
- Global Constraints
- Global Constraints
- format.ts
- format.ts
- Savings Goals
- Walletly Supabase Provider Setup
- Global Constraints
- Global Constraints
- Global Constraints
- constants.ts
- currency-input.ts
- notifications.ts
- constants.ts
- currency-input.ts
- notifications.ts
- offline-sync.ts
- Walletly release checklist
- Global Constraints
- Global Constraints
- Walletly Production Hardening Design
- tag-picker.tsx
- supabase.ts
- supabase.ts
- action-rate-limit.ts
- AGENTS.md
- Walletly Expo to Next.js PWA Migration Note
- Walletly Web Visual Parity
- profile.tsx
- index.ts
- index.ts
- Production readiness
- Walletly SEO audit
- Walletly Savings Goals Implementation Plan
- category-icon.tsx
- error-reporting.ts
- secure-storage.ts
- category-icon.tsx
- error-reporting.ts
- secure-storage.ts
- test-goals-db.mjs
- validate-auth-config.mjs
- validate-seo.mjs
- verify-auth-routes.mjs
- vercel.json
- Walletly Monitoring
- auth.tsx
- auth.tsx
- validate-pwa.mjs
- Walletly third-party audit
- analytics.ts
- analytics.ts
- next.config.ts
- layout.tsx
- layout.tsx
- e2e.md
- next-env.d.ts
- sw.js
- global.d.ts
- tailwind.config.ts
- service-worker-cache.test.ts

## God Nodes (most connected - your core abstractions)
1. `useLedgerTheme()` - 141 edges
2. `useAppStore()` - 64 edges
3. `spacing` - 55 edges
4. `AppStoreProvider()` - 54 edges
5. `useI18n()` - 51 edges
6. `radius` - 47 edges
7. `AppStoreProvider()` - 31 edges
8. `AppStoreProvider()` - 31 edges
9. `formatMoney()` - 29 edges
10. `languageLocale()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `InfoRow()` --calls--> `useLedgerTheme()`  [EXTRACTED]
  expo-retired/src-before-next/app/(tabs)/profile.tsx → src/theme/theme-provider.tsx
- `LinkRow()` --calls--> `useLedgerTheme()`  [EXTRACTED]
  expo-retired/src-before-next/app/(tabs)/settings.tsx → src/theme/theme-provider.tsx
- `ErrorBoundary()` --calls--> `reportError()`  [EXTRACTED]
  expo-retired/src-before-next/app/_layout.tsx → src/lib/error-reporting.ts
- `LegalLink()` --calls--> `useLedgerTheme()`  [EXTRACTED]
  expo-retired/src-before-next/components/auth-panel.tsx → src/theme/theme-provider.tsx
- `ConsentRow()` --calls--> `useLedgerTheme()`  [EXTRACTED]
  expo-retired/src-before-next/components/auth-panel.tsx → src/theme/theme-provider.tsx

## Import Cycles
- None detected.

## Communities (124 total, 20 thin omitted)

### Community 0 - "useLedgerTheme"
Cohesion: 0.04
Nodes (72): AuthCallbackScreen(), styles, OnboardingScreen(), styles, AuthCallbackScreen(), styles, OnboardingScreen(), styles (+64 more)

### Community 1 - "app-store.tsx"
Cohesion: 0.10
Nodes (46): AppStoreProvider(), createInitialData(), demoIdentity(), initialData, isVisibleCategory(), mergeLatest(), ownsOperation(), ownsRecord() (+38 more)

### Community 2 - "formatMoney"
Cohesion: 0.12
Nodes (36): AnalyticsScreen(), Period, styles, DateFilter, HistoryScreen(), styles, getInitials(), HomeScreen() (+28 more)

### Community 3 - "types.ts"
Cohesion: 0.07
Nodes (28): Row, accountBalance(), calendarDay(), CategoryBudgetError, categoryBudgetStatus(), isoWeekKey(), validateCategoryBudget(), Account (+20 more)

### Community 4 - "scripts"
Cohesion: 0.05
Nodes (37): dependencies, lucide-react, next, react, react-dom, @supabase/supabase-js, devDependencies, eslint (+29 more)

### Community 5 - "app-store.tsx"
Cohesion: 0.13
Nodes (35): AppStoreProvider(), createInitialData(), demoIdentity(), isVisibleCategory(), mergeLatest(), queue(), readAccountData(), scopeDataToUser() (+27 more)

### Community 6 - "savings-goals.tsx"
Cohesion: 0.11
Nodes (32): CurrencyAmountInput(), CurrencyAmountInputProps, CompletionPanel, confettiColors, confettiVectors, ContributionForm(), GoalDatePicker(), GoalForm() (+24 more)

### Community 7 - "add-expense.tsx"
Cohesion: 0.09
Nodes (18): AddExpenseScreen(), styles, TextSelection, toDateInput(), AddExpenseScreen(), styles, TextSelection, toDateInput() (+10 more)

### Community 8 - "category-icon.tsx"
Cohesion: 0.09
Nodes (24): styles, styles, AddCategoryChoice(), CategoryChoice(), CategoryChoiceProps, styles, CategoryIconPicker(), OPTIONS (+16 more)

### Community 9 - "supabase.ts"
Cohesion: 0.09
Nodes (23): AuthPanel(), ConsentRow(), LegalLink(), styles, flushOperations(), sendOperation(), wait(), AuthPanel() (+15 more)

### Community 10 - "walletly-app.tsx"
Cohesion: 0.15
Nodes (28): categoryIconNames, ActivePill(), ConsentBanner(), cx(), dateFromInput(), dateInputValue(), DatePicker(), DesktopNav() (+20 more)

### Community 11 - "settings.tsx"
Cohesion: 0.10
Nodes (17): LinkRow(), styles, LinkRow(), styles, styles, ThemeContext, ThemeContextValue, styles (+9 more)

### Community 12 - "expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+16 more)

### Community 13 - "expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, versionCode (+16 more)

### Community 14 - "radius"
Cohesion: 0.09
Nodes (16): Button(), styles, Variant, IconButton(), styles, styles, WalletCard(), Button() (+8 more)

### Community 15 - "WalletlyApp"
Cohesion: 0.11
Nodes (8): metadata, metadata, metadata, metadata, metadata, metadata, WalletlyApp(), privatePageMetadata

### Community 16 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 17 - "recurring.ts"
Cohesion: 0.18
Nodes (16): addDays(), MaterializedRecurringTransaction, materializeDueRecurringRules(), nextOccurrenceDate(), RecurringError, recurringOccurrenceId(), uuidBytes(), validateRecurringRule() (+8 more)

### Community 18 - "Design System Master File"
Cohesion: 0.12
Nodes (16): Additional Forbidden Patterns, Anti-Patterns (Do NOT Use), Buttons, Cards, Color Palette, Component Specs, Design System Master File, Global Rules (+8 more)

### Community 19 - "i18n-provider.tsx"
Cohesion: 0.15
Nodes (11): ErrorBoundary(), Navigator(), styles, metadata, viewport, Providers(), I18nContext, I18nContextValue (+3 more)

### Community 20 - "i18n.ts"
Cohesion: 0.23
Nodes (10): I18nContext, I18nProvider(), I18nValue, I18nContext, I18nProvider(), I18nValue, createTranslator(), detectLanguage() (+2 more)

### Community 21 - "auth-tour.tsx"
Cohesion: 0.14
Nodes (8): AnimatedNumber(), AnimatedPath, AnimatedTextInput, AuthTour(), AuthTourProps, formatAnimatedNumber(), slides, styles

### Community 22 - "auth-tour.tsx"
Cohesion: 0.14
Nodes (8): AnimatedNumber(), AnimatedPath, AnimatedTextInput, AuthTour(), AuthTourProps, formatAnimatedNumber(), slides, styles

### Community 23 - "Walletly Rate Limits and Email-Link Expiry Design"
Cohesion: 0.14
Nodes (13): Browser Cooldowns, Components, Email-Link Lifetime, Goal, Hosted Email Configuration, Layered Rate Limits, Other Action Boundaries, References (+5 more)

### Community 24 - "types.ts"
Cohesion: 0.14
Nodes (13): Category, CategoryIconName, ConsentRecord, Expense, ExpenseDraft, Language, PaymentMethod, PersistedAppData (+5 more)

### Community 25 - "types.ts"
Cohesion: 0.14
Nodes (13): Category, CategoryIconName, ConsentRecord, Expense, ExpenseDraft, Language, PaymentMethod, PersistedAppData (+5 more)

### Community 26 - "seo.ts"
Cohesion: 0.20
Nodes (5): metadata, metadata, publicPageMetadata(), PublicPageMetadataOptions, siteUrl

### Community 27 - "InsightsView"
Cohesion: 0.34
Nodes (12): InsightsView(), activeBudget(), activeExpenses(), activeIncome(), budgetStatus(), monthKey(), remainingBudget(), sumAmounts() (+4 more)

### Community 28 - "constants.ts"
Cohesion: 0.21
Nodes (9): CURRENCIES, DEFAULT_PAYMENT_METHODS, GLOBAL_CATEGORIES, createDemoData(), dateDaysAgo(), dateKey(), csvCell(), exportWalletlyData() (+1 more)

### Community 29 - "Walletly Onboarding and Surface Redesign"
Cohesion: 0.15
Nodes (12): Account Data Isolation, Combined Tour and Authentication, Design Principles, Error Handling, Expense Entry, Geometry and Surfaces, Home, Objective (+4 more)

### Community 30 - "useAppStore"
Cohesion: 0.21
Nodes (11): Index(), Navigator(), ManageScreen(), SettingsScreen(), Index(), ManageScreen(), SettingsScreen(), AuthScreen() (+3 more)

### Community 31 - "_layout.tsx"
Cohesion: 0.24
Nodes (8): ErrorBoundary(), styles, Error(), GlobalError(), endpoint, ErrorContext, reportError(), sanitize()

### Community 32 - "legal-page.tsx"
Cohesion: 0.19
Nodes (6): metadata, metadata, metadata, copyKeys, LegalPage(), titleKeys

### Community 33 - "File Structure"
Cohesion: 0.17
Nodes (11): File Structure, Global Constraints, Self-Review, Task 1: Category Budgets Domain, Task 2: Category Budgets Persistence And UI, Task 3: Recurring Income And Expenses, Task 4: Manual Accounts And Balances, Task 5: Demo Data And Insights Story (+3 more)

### Community 34 - "Baseline"
Cohesion: 0.17
Nodes (11): Baseline, Global Constraints, Task 1: Supabase Schema And RLS, Task 2: Store And Offline Recovery, Task 3: Category Budgets UI, Task 4: Recurring Rules UI, Task 5: Manual Accounts UI, Task 6: Exports And Demo Story (+3 more)

### Community 35 - "Walletly Email OTP Sign-In Design"
Cohesion: 0.17
Nodes (11): Authentication Experience, Chosen Approach, Email Design, Error And Security Behavior, Goal, Localization, Release Boundary, Repository Changes (+3 more)

### Community 37 - "Walletly History, Icons, Theme, and Localization Design"
Cohesion: 0.18
Nodes (10): Data contracts, Goal, Localization, Manual category icon selection, Non-goals, Scope, Swipe-to-delete history rows, Testing (+2 more)

### Community 38 - "Walletly Magic-Link Authentication Design"
Cohesion: 0.18
Nodes (10): Authentication Experience, Chosen Approach, Email Templates, Goal, Link Verification Route, Localization, Release Boundary, Repository Changes (+2 more)

### Community 39 - "Language"
Cohesion: 0.18
Nodes (5): TranslationKey, translations, TranslationKey, translations, Language

### Community 40 - "index.ts"
Cohesion: 0.20
Nodes (8): cronSecret, localDate(), loggedToday(), PushSubscription, ReminderPreference, supabaseUrl, vapidPrivateKey, vapidPublicKey

### Community 41 - "Page-Specific Rules"
Cohesion: 0.20
Nodes (9): Add Expense Page Overrides, Color Overrides, Component Overrides, Layout Overrides, Page-Specific Components, Page-Specific Rules, Recommendations, Spacing Overrides (+1 more)

### Community 42 - "Walletly"
Cohesion: 0.20
Nodes (9): Current Limitations, Documentation, Production, PWA Installation, Run Locally, SEO and production URL, Supabase, Walletly (+1 more)

### Community 43 - "Walletly Next.js PWA Deployment"
Cohesion: 0.22
Nodes (8): Local Development, Notifications, Production Build, PWA Installation, Supabase Auth Redirects, Supabase Email Links, Vercel, Walletly Next.js PWA Deployment

### Community 44 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Task 1: Semantic Geometry and Shared Choice Controls, Task 2: Combined Tour and Authentication, Task 3: Account-Scoped Persistence and Personalized Home, Task 4: Live Currency Formatting and Expense Controls, Task 5: Unframed Insights and Utility Surfaces, Task 6: Integration and Release Verification, Walletly Onboarding and Surface Redesign Implementation Plan

### Community 45 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Task 1: Auth Environment and Hosted-Test Contract, Task 2: Income and Monthly Budgets, Task 3: Web Push Subscriptions and Cron Reminders, Task 4: Production Error Monitoring and Dependency Hygiene, Task 5: Playwright E2E Coverage, Task 6: Full Verification and Local Handoff, Walletly Production Hardening Implementation Plan

### Community 48 - "Savings Goals"
Cohesion: 0.25
Nodes (7): Behavior, Database Activation, Exact Files Changed, Exports, Release Boundaries, Savings Goals, Verification Commands

### Community 49 - "Walletly Supabase Provider Setup"
Cohesion: 0.25
Nodes (7): 1. App Configuration, 2. Redirect URLs, 3. Google OAuth, 4. Passwordless Email Links, 5. Database, 6. Verification, Walletly Supabase Provider Setup

### Community 50 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Task 1: Add language contracts and translation provider, Task 2: Persist and edit category icons, Task 3: Replace history delete controls with swipe-to-delete, Task 4: Animate theme changes, Task 5: Full verification and simulator QA, Walletly History, Icons, Theme, and Localization Implementation Plan

### Community 51 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Task 1: Pure OTP State And Timing, Task 2: Supabase And Store Authentication Contract, Task 3: Localized Two-Step OTP Interface, Task 4: Supabase OTP Configuration And Premium Email, Task 5: Documentation And Release Verification, Walletly Email OTP Implementation Plan

### Community 52 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Task 1: Pure Rate-Limit Helpers, Task 2: Email Cooldown and Accurate Auth Errors, Task 3: Export, Deletion, and Sync Boundaries, Task 4: Supabase and Resend Configuration, Task 5: Complete Verification, Walletly Rate Limits and Email-Link Expiry Implementation Plan

### Community 53 - "constants.ts"
Cohesion: 0.25
Nodes (5): CURRENCIES, DEFAULT_PAYMENT_METHODS, GLOBAL_CATEGORIES, TAG_SUGGESTIONS, WALLETLY_CURRENCIES

### Community 54 - "currency-input.ts"
Cohesion: 0.32
Nodes (6): AmountDraft, findDecimalIndex(), formatAmountDraft(), getLocaleConfig(), localeConfigCache, LocaleNumberConfig

### Community 55 - "notifications.ts"
Cohesion: 0.54
Nodes (7): clearReminderSchedule(), configureAndroidChannel(), notificationsEnabled(), readReminderIds(), reminderDates(), scheduleNextReminder(), setDailyReminderEnabled()

### Community 56 - "constants.ts"
Cohesion: 0.25
Nodes (5): CURRENCIES, DEFAULT_PAYMENT_METHODS, GLOBAL_CATEGORIES, TAG_SUGGESTIONS, WALLETLY_CURRENCIES

### Community 57 - "currency-input.ts"
Cohesion: 0.32
Nodes (6): AmountDraft, findDecimalIndex(), formatAmountDraft(), getLocaleConfig(), localeConfigCache, LocaleNumberConfig

### Community 58 - "notifications.ts"
Cohesion: 0.54
Nodes (7): clearReminderSchedule(), configureAndroidChannel(), notificationsEnabled(), readReminderIds(), reminderDates(), scheduleNextReminder(), setDailyReminderEnabled()

### Community 59 - "offline-sync.ts"
Cohesion: 0.36
Nodes (4): flushOperations(), FlushOptions, SyncOperation, operation()

### Community 60 - "Walletly release checklist"
Cohesion: 0.29
Nodes (6): Auth and data checks, Automated checks, Build and store, Device matrix, Notifications and privacy, Walletly release checklist

### Community 61 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Task 1: Project Runtime, Task 2: Browser Data Layer, Task 3: Responsive PWA UI, Task 4: PWA and Deployment, Walletly Next.js PWA Migration Implementation Plan

### Community 62 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Task 1: Magic-Link Supabase Adapter, Task 2: Link-Only UI and Confirmation Route, Task 3: Supabase Templates and Local Configuration, Task 4: Documentation and Full Release Checks, Walletly Magic-Link Authentication Implementation Plan

### Community 63 - "Walletly Production Hardening Design"
Cohesion: 0.29
Nodes (6): Architecture, Data Model, Goal, Scope, Verification, Walletly Production Hardening Design

### Community 64 - "tag-picker.tsx"
Cohesion: 0.29
Nodes (5): styles, TagPicker(), styles, TagPicker(), TAG_SUGGESTIONS

### Community 65 - "supabase.ts"
Cohesion: 0.48
Nodes (6): finishAuthCallback(), getAuthRedirectUri(), getCallbackParams(), isSupabaseConfigured, signInWithEmail(), signInWithProvider()

### Community 66 - "supabase.ts"
Cohesion: 0.48
Nodes (6): finishAuthCallback(), getAuthRedirectUri(), getCallbackParams(), isSupabaseConfigured, signInWithEmail(), signInWithProvider()

### Community 67 - "action-rate-limit.ts"
Cohesion: 0.48
Nodes (5): consumeRollingWindow(), formatShortCountdown(), parseStoredDeadline(), RollingWindowResult, secondsUntil()

### Community 68 - "AGENTS.md"
Cohesion: 0.33
Nodes (5): Building with EAS, Commands, Expo has changed — do not trust your training data, Navigation & Routing, Rules

### Community 69 - "Walletly Expo to Next.js PWA Migration Note"
Cohesion: 0.33
Nodes (5): Rebuilt for Web, Retained, Retired Expo Files, Verification Checklist, Walletly Expo to Next.js PWA Migration Note

### Community 70 - "Walletly Web Visual Parity"
Cohesion: 0.33
Nodes (5): Responsive composition, Source of truth, Verification, Visual system, Walletly Web Visual Parity

### Community 71 - "profile.tsx"
Cohesion: 0.40
Nodes (4): getInitials(), InfoRow(), ProviderAvatar(), styles

### Community 72 - "index.ts"
Cohesion: 0.33
Nodes (5): palettes, radius, spacing, Theme, typography

### Community 73 - "index.ts"
Cohesion: 0.33
Nodes (5): palettes, radius, spacing, Theme, typography

### Community 74 - "Production readiness"
Cohesion: 0.40
Nodes (4): Production readiness, Required before release, Security expectations, Verified locally

### Community 75 - "Walletly SEO audit"
Cohesion: 0.40
Nodes (4): Implemented, Production verification, Scope limitation, Walletly SEO audit

### Community 76 - "Walletly Savings Goals Implementation Plan"
Cohesion: 0.40
Nodes (4): Constraints, Results, Tasks, Walletly Savings Goals Implementation Plan

### Community 77 - "category-icon.tsx"
Cohesion: 0.50
Nodes (4): CategoryIcon(), getCategoryIcon(), iconByName, icons

### Community 78 - "error-reporting.ts"
Cohesion: 0.50
Nodes (4): endpoint, ErrorContext, reportError(), sanitize()

### Community 80 - "category-icon.tsx"
Cohesion: 0.50
Nodes (4): CategoryIcon(), getCategoryIcon(), iconByName, icons

### Community 81 - "error-reporting.ts"
Cohesion: 0.50
Nodes (4): endpoint, ErrorContext, reportError(), sanitize()

### Community 83 - "test-goals-db.mjs"
Cohesion: 0.40
Nodes (3): binaries, cluster, directory

### Community 85 - "validate-seo.mjs"
Cohesion: 0.40
Nodes (4): failures, missing, requiredFiles, sourceChecks

### Community 86 - "verify-auth-routes.mjs"
Cohesion: 0.40
Nodes (4): client, email, oauthUrl, origin

### Community 87 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, devCommand, framework, installCommand

### Community 88 - "Walletly Monitoring"
Cohesion: 0.50
Nodes (3): Configure a collector, Verify locally, Walletly Monitoring

### Community 91 - "validate-pwa.mjs"
Cohesion: 0.50
Nodes (3): manifest, missing, required

## Knowledge Gaps
- **556 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+551 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLedgerTheme()` connect `useLedgerTheme` to `tag-picker.tsx`, `formatMoney`, `add-expense.tsx`, `category-icon.tsx`, `profile.tsx`, `supabase.ts`, `settings.tsx`, `walletly-app.tsx`, `category-icon.tsx`, `radius`, `category-icon.tsx`, `i18n-provider.tsx`, `auth-tour.tsx`, `auth-tour.tsx`, `useAppStore`, `_layout.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `useI18n()` connect `walletly-app.tsx` to `useLedgerTheme`, `legal-page.tsx`, `formatMoney`, `savings-goals.tsx`, `category-icon.tsx`, `supabase.ts`, `settings.tsx`, `WalletlyApp`, `i18n-provider.tsx`, `InsightsView`, `useAppStore`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `useAppStore()` connect `useAppStore` to `useLedgerTheme`, `formatMoney`, `app-store.tsx`, `savings-goals.tsx`, `add-expense.tsx`, `category-icon.tsx`, `profile.tsx`, `supabase.ts`, `settings.tsx`, `walletly-app.tsx`, `WalletlyApp`, `i18n-provider.tsx`, `InsightsView`, `_layout.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `AppStoreProvider()` (e.g. with `createInitialData()` and `toAccount()`) actually correct?**
  _`AppStoreProvider()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _557 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useLedgerTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.04101010101010101 - nodes in this community are weakly interconnected._
- **Should `app-store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10377358490566038 - nodes in this community are weakly interconnected._