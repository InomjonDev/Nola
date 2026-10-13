# Nola Soft Flat Refinement

The user's seven explicit corrections refine the approved Apple-inspired design. Implement directly within the current redesign scope.

- [ ] Replace expense/income/goal switches with two flat rounded controls: Overview and Goals. Keep income and expenses together in Overview.
- [ ] Show same-month income, expense, and balance totals plus a date-sorted mixed transaction list. Use rounded flat badges for transaction kinds.
- [ ] Add adaptive soft backgrounds to category/navigation icons and round controls to 10–16px. Keep every control free of shadows, bevels, blur, and simulated depth.
- [ ] Move primary add actions to a shared bottom-right button above the navigation: expense on the main screens, expense/income chooser in Overview, and new goal in Goals.
- [ ] Make the navbar icon-only with translated accessible names and tooltips. Preserve route behavior and visible selected state.
- [ ] Keep pure white/black canvases and English/Russian/Uzbek translations. Retain keyboard focus indicators, 44px touch areas, full amounts, and editor focus handling.
- [ ] Check phone/desktop layouts and both themes, update the affected interaction tests, then run lint, typecheck, relevant browser tests, unit tests, and a production build.

Files: shared theme/CSS, category icon, floating add button, cash-flow view/income editor, Nola shell/Insights, savings goal primary action, translations, and affected Playwright tests. Keep the existing store APIs, authentication, offline syncing, and financial calculations.
