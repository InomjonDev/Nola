# Insights and Goals Polish Design

## Goal

Make the Insights cash-flow and transaction area easier to scan, remove weekly activity, and make goal completion a clear, automatic celebration with an animated creation sheet.

## Insights

- Keep the month selector and interactive category donut at the top of Insights.
- Remove the Weekly Activity section from the page.
- Replace the two large Income and Expenses blocks and detached Balance row with one balanced cash-flow summary: a prominent net balance and two supporting income/spending totals.
- Present transactions as a date-grouped ledger. Each row contains the category icon, transaction title, muted category/description, and a signed amount aligned at the trailing edge. Remove the redundant per-row Income/Expense badge.
- Keep the Budget section below transactions. When a budget exists, show spent, remaining, and progress. When no budget exists, present the monthly limit field and save action together as one compact form.
- Use Nola's existing light/dark surfaces, typography, accent tokens, currency formatting, and localized labels.

## Goal completion and form motion

- A goal is newly complete when an added deposit crosses its target, matching the existing completion detection.
- On a new completion, show a non-blocking confetti celebration for about one second, archive the goal automatically, and switch to the Archived filter so the completed goal remains visible. Do not show a confirmation dialog.
- Persist the automatic archive even if the user leaves the Goals page during the celebration. Reduced-motion preference replaces moving confetti with a static success treatment while retaining automatic archive behavior.
- Animate the Goals sheet into and out of view with a short fade and vertical movement. Keep focus management, escape/backdrop dismissal, and form submission behavior intact. Reduced-motion preference disables the transition.
- Do not add a motion or confetti dependency; use the existing CSS and SVG design system.

## Scope and accessibility

- Keep the interactive donut, month navigation, add-income/add-expense actions, transaction editing, and budget behavior.
- Keep goals' existing currency/date validation and contribution history.
- Ensure transaction rows remain full-width labeled buttons and progress remains exposed semantically.
- Announce goal completion to assistive technology; decorative confetti is hidden from the accessibility tree.
- No changes to database shape or RLS policies are required.
