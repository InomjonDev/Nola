import type { TranslationKey } from "@/lib/i18n";
import type { Category, CategoryIconName } from "@/lib/types";

type Translator = (key: TranslationKey) => string;
const categories: Record<string, TranslationKey> = {
  Food: "category.food", Transport: "category.transport", Bills: "category.bills",
  Shopping: "category.shopping", Entertainment: "category.entertainment",
};
const payments: Record<string, TranslationKey> = {
  Card: "payment.card", Cash: "payment.cash", "Bank transfer": "payment.bankTransfer",
};
export function categoryLabel(category: Pick<Category, "name" | "kind">, t: Translator) {
  const key = category.kind === "global" ? categories[category.name] : undefined;
  return key ? t(key) : category.name;
}
export function paymentLabel(name: string, t: Translator) {
  const key = payments[name];
  return key ? t(key) : name;
}
export function categoryIconLabel(icon: CategoryIconName, t: Translator) {
  return t(`category.icon.${icon}`);
}
