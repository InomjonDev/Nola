import type { Expense, SpendingCapture } from '@/lib/types'

function localDateKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function totalSpendingForCurrency(
	expenses: Expense[],
	currency: string,
) {
	const selectedCurrency = currency.toUpperCase()
	return expenses
		.filter(
			expense =>
				!expense.deletedAt && expense.currency.toUpperCase() === selectedCurrency,
		)
		.reduce((sum, expense) => sum + expense.amount, 0)
}

export function currentSpendingStreak(expenses: Expense[], now = new Date()) {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const todayStart = today.getTime()
	const daysWithSpending = new Set(
		expenses
			.filter(expense => !expense.deletedAt)
			.map(expense => new Date(expense.spentAt))
			.filter(date => Number.isFinite(date.getTime()))
			.filter(
				date =>
					new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() <=
					todayStart,
			)
			.map(localDateKey),
	)

	const startOffset = daysWithSpending.has(localDateKey(today))
		? 0
		: daysWithSpending.has(
					localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
				)
			? 1
			: null
	if (startOffset === null) return 0

	let streak = 0
	for (let offset = startOffset; ; offset += 1) {
		const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
		if (!daysWithSpending.has(localDateKey(day))) break
		streak += 1
	}
	return streak
}

export function activeSpendingNoteCount(captures: SpendingCapture[]) {
	return captures.filter(
		capture => !capture.deletedAt && capture.parseStatus !== 'undone',
	).length
}
