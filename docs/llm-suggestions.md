# Suggestions for Nola's AI

Nola should let people write expenses, income, and savings goals in ordinary language. The AI should identify what the person means, while Nola's normal code checks amounts, dates, and where each action will be saved.

## Expenses and math

- Treat a price followed by a quantity as a price per item unless the note says it is the total. For example, “Coffee $7 2x” means two coffees at $7 each, so the expense total is $14.
- If the person says “$7 total for two coffees,” keep the total at $7. Do not multiply it again.
- Calculate totals in the app after the AI identifies the unit price and quantity. Check the result before saving it.
- Keep the quantity as well as the total so the person can see what they bought and how many.
- If the note is unclear about whether a price is per item or the full total, ask before saving the expense.

## Savings goals

- “New goal: New Phone until April 2027” means the person wants a new savings goal named “New Phone” with a deadline of April 30, 2027.
- A goal must have a target amount. If the person leaves it out, ask for the amount and save none of the actions from that note until they answer.
- “$30 added to New Phone” means add a $30 deposit to the existing “New Phone” goal. Do not create a second goal for it.
- If no active goal matches the name, or more than one goal could match, ask which goal the person means. Never guess and put their savings in the wrong goal.
- Do not invent a target, deadline, amount, or goal name.

## Income

- “$2,000 income salary” means record $2,000 of income with “Salary” as its description.
- Use the currency and date written in the note. If there is no date, use the date the person wrote the note. If there is no currency symbol, use their normal currency.
- Only record income when the note clearly says money was earned or received. Do not mistake an expense or a savings deposit for income.

## Safer behavior

- If any action in one note needs clarification, ask first and save none of the money actions from that note. This avoids recording only part of what the person wrote.
- Keep the original note. Show a clear message when an amount, date, or goal name needs clarification.
- Make sure retrying the same note does not add duplicate expenses, income, goals, or deposits.
- Keep changes on the device first and sync them when the connection is available.
- Be clear that note text is sent to Google Gemini when AI parsing is enabled. The free service may use prompts and responses to improve Google's products, so people should not put private information in notes.

## Further suggestions

Use the AI to understand the person's words, but use ordinary app code to do the arithmetic and validate every action before saving. Ask a short question whenever a missing or ambiguous detail could change someone's financial records. Keep a small set of synthetic examples for each supported language and check quantity math, dates, income, goals, deposits, and unclear wording whenever the instructions or model change.
