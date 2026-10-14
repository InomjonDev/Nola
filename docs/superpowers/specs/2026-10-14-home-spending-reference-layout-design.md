# Home Spending Layout Design

## Goal

Make the home spending area easier to scan by adapting the reference screenshot's category summary and dated transaction hierarchy to Nola's existing spending notes.

## Layout

1. Preserve the current monthly total and eye control, followed by the weekly total, using Nola's existing white light theme and dark theme tokens. Do not use the reference's pink hero color.
2. Add a `Categories` section for the current month. Show only categories with spending. Each row contains a solid category icon badge, category name, formatted total, and a thin proportional bar. Bar proportions use each category's share of current-month expenses in the profile currency.
3. Keep spending notes below the category summary, grouped by capture day. Each compact note row shows a small muted date, horizontally stacked circular category badges, expense count, and total aligned to the trailing edge. Preserve note opening behavior and full-screen note detail.

## Data and behavior

- Category totals include active, non-deleted expenses dated from the start of the current calendar month up to the start of next month, in the profile currency. Use the app's existing currency formatting; do not convert between currencies.
- A note's category badges represent its distinct linked expense categories, in first-seen order; show at most four badges and a count for any additional categories.
- A note's total and expense count include active linked expenses only. Notes without parsed expenses retain their existing parse and retry status presentation.
- Group note rows by the capture's local calendar date. Expense dates inside a note do not move the note row to another day.
- Existing search, folder, and category filters continue to apply to the note list. The category summary is shown only on the unfiltered home view; filtered folder/category views retain their current layout.
- Empty categories are omitted. Existing empty-state messaging remains when there are no notes.

## Visual and accessibility requirements

- Use the existing category colors as solid icon backgrounds, Nola's white/light and black/dark surfaces, and existing typography and spacing tokens.
- Keep dates and secondary metadata visually muted while maintaining readable contrast. Keep amounts tabular and right aligned.
- Make note rows remain full-width touch targets with visible keyboard focus and an accessible label that includes date, count, and total.
- Respect reduced-motion preferences; the change does not require new animation.

## Scope

This is a home presentation change. It does not change expense parsing, note storage, note deletion, category definitions, insights, or navigation.
