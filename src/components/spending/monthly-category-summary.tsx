"use client";

import { CategoryIcon, categoryAccent } from "@/components/category-icon";
import { categoryLabel } from "@/lib/display-labels";
import { formatMoney } from "@/lib/format";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Category, Expense } from "@/lib/types";

export function MonthlyCategorySummary({
  expenses,
  categories,
  currency,
}: {
  expenses: Expense[];
  categories: Category[];
  currency: string;
}) {
  const { language, t } = useI18n();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const spentAt = new Date(expense.spentAt);
    if (
      expense.deletedAt ||
      expense.currency !== currency ||
      spentAt < monthStart ||
      spentAt >= nextMonthStart ||
      !Number.isFinite(spentAt.getTime())
    ) continue;
    totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount);
  }

  const items = [...totals]
    .map(([categoryId, amount]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        category,
        label: category ? categoryLabel(category, t) : t("activity.expense"),
        amount,
      };
    })
    .sort((left, right) => right.amount - left.amount);
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  if (!items.length || total <= 0) return null;

  return <section className="monthly-category-summary" aria-labelledby="monthly-category-title">
    <h2 id="monthly-category-title" className="monthly-category-heading">{t("insights.categories")}</h2>
    <div className="monthly-category-rows" role="list">
      {items.map(({ categoryId, category, label, amount }) => {
        const share = Math.min(100, Math.max(0, amount / total * 100));
        return <div key={categoryId} className="monthly-category-row" role="listitem">
          <CategoryIcon name={category?.name} icon={category?.icon} className="h-4 w-4" size={16} />
          <div className="monthly-category-content">
            <div className="monthly-category-copy">
              <span className="monthly-category-name">{label}</span>
              <span className="monthly-category-amount">{formatMoney(amount, currency, languageLocale(language))}</span>
            </div>
            <span className="monthly-category-track" aria-hidden="true">
              <span className="monthly-category-fill" style={{ width: `${share}%`, backgroundColor: categoryAccent(category?.icon) }} />
            </span>
          </div>
        </div>;
      })}
    </div>
  </section>;
}
