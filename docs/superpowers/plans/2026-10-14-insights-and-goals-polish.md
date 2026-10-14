# Insights and Goals Polish Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. Preserve unrelated local edits. Do not push or commit implementation changes.

**Goal:** Simplify Insights cash-flow reporting and make goal completion celebrate and archive automatically, with a smooth goal creation sheet.

**Architecture:** Keep the existing interactive category donut and store model. Refine `CashFlowView` presentation and remove its weekly activity chart. Keep completion detection at the existing newly-completed-by-deposit boundary, then celebrate and archive the goal without a modal decision. Animate the existing portal sheet with CSS and retain current focus management.

**Tech Stack:** Next.js 15, React 19, TypeScript, existing CSS tokens, existing local-first goal store and i18n.

## Global Constraints

- Keep the existing month selector and interactive category donut at the top of Insights.
- Use Nola's current light/dark surfaces, typography, accent tokens, currency formatting, and localized labels.
- Archive only when a new deposit transitions an active goal from incomplete to complete.
- Do not change database shape, RLS, or goal contribution validation.
- Respect `prefers-reduced-motion`; do not add animation or confetti dependencies.
- Do not add or run tests. Run the repository-required lint and typecheck checks.
- Keep all implementation changes local and uncommitted; do not push.

## File Map

- Modify `src/components/cash-flow.tsx` to remove Weekly Activity, simplify the cash-flow summary and transaction rows, and retain current editing actions.
- Modify `src/components/savings-goals.tsx` to replace the completion prompt with celebration and automatic archive, and animate the GoalSheet lifecycle.
- Modify `src/lib/i18n.ts` for localized completion-and-archive feedback if existing labels do not express the new behavior.
- Modify `src/app/globals.css` for the summary, transaction ledger, budget form, goal-sheet transition, and restrained confetti burst.

### Task 1: Refine Insights cash flow and transactions

**Files:**
- Modify: `src/components/cash-flow.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Preserve `CashFlowView({ onAddExpense, onEditExpense })`.
- Preserve month selection, donut selection, income editor, add menu, budget save/remove actions, transaction edit actions, and translated values.

- [x] Remove the `<WeeklyActivity ... />` call and the unused `WeeklyActivity` component.
- [x] Replace the Income/Expenses cards plus detached Balance row with one `cash-flow-summary` section containing a prominent balance and two subordinate income/spending totals.
- [x] For each transaction row, retain its category icon, title, signed amount, accessible label, and edit callback; replace the Expense/Income badge with a muted category or income label.
- [x] Restyle Budget as a compact section: keep progress and remaining amount when set; group the empty-state text, monthly limit input, and Save action when unset.
- [x] Keep white and black theme surfaces and mobile wrapping safe for long localized labels and currency amounts.

### Task 2: Celebrate and archive completed goals

**Files:**
- Modify: `src/components/savings-goals.tsx`
- Modify: `src/lib/i18n.ts` only if needed for completion feedback
- Modify: `src/app/globals.css`

**Interfaces:**
- Keep `GoalPanel` for new/detail/edit/deposit/withdrawal/delete; remove the completion confirmation panel.
- Keep `goalCompletionSnapshot`, `newlyCompletedByDeposit`, `goalProgress`, and `store.archiveGoal` as the existing completion and persistence interfaces.

- [x] When a newly-added deposit first reaches the target, show a non-blocking celebration status and a short CSS confetti burst; expose the status through `role="status"` and hide decorative particles from assistive technology.
- [x] Archive the completed goal automatically after the brief celebration, without a keep-active/archive prompt, then switch the Goals filter to Archived so the goal remains visible.
- [x] Ensure the pending archive timer completes if the user navigates away from Goals during the celebration; re-check that the goal still exists, is active, and remains complete before archiving.
- [x] Remove the former completion prompt copy from English, Russian, and Uzbek.
- [x] Provide a static success treatment when `prefers-reduced-motion: reduce` is enabled while preserving automatic archive behavior.

### Task 3: Animate the Goal creation sheet

**Files:**
- Modify: `src/components/savings-goals.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Preserve `GoalSheet({ title, onClose, children })`, `useDialogFocus`, and the child form's `dismiss` callback.

- [x] Add a short sheet enter transition and matching close transition for the new-goal form; keep the existing full-screen mobile sheet and centered desktop width.
- [x] Route close button, Escape/backdrop dismissal, and successful form submission through one transition-aware dismiss callback.
- [x] Disable sheet animations under reduced-motion preference and keep focus return behavior intact.

### Task 4: Validate changes

**Files:**
- No additional files.

- [x] Run `npm run typecheck` and confirm exit code 0.
- [x] Run `npm run lint` and confirm exit code 0.
- [x] Run `git diff --check`; inspect that only requested source files changed and do not push or commit implementation changes.

## Self-Review

- Insights donut and month navigation remain at the top; Weekly Activity is removed.
- Summary, transactions, and budget preserve their current values, edit actions, formatting, and store behavior.
- A successful deposit that completes an active goal triggers the no-prompt archive flow; other goal lifecycle behavior stays as-is.
- Completion feedback and sheet transitions support reduced-motion preferences.
