import type { LucideIcon } from "lucide-react-native";
import { BriefcaseBusiness, CarFront, CircleDollarSign, Clapperboard, Coffee, Dumbbell, Gift, HeartPulse, Home, MoreHorizontal, Plane, ReceiptText, ShoppingBag, Ticket, Utensils, WalletCards, Fuel } from "lucide-react-native";
import { createElement } from "react";
import { View } from "react-native";

import { radius } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";
import type { CategoryIconName } from "@/lib/types";

const icons: [string, LucideIcon][] = [
  ["food", Utensils],
  ["transport", CarFront],
  ["bills", ReceiptText],
  ["shopping", ShoppingBag],
  ["entertainment", Clapperboard],
  ["fitness", Dumbbell],
  ["health", CircleDollarSign],
  ["home", Home],
  ["travel", Plane],
  ["work", BriefcaseBusiness],
  ["gift", Gift],
  ["coffee", Coffee],
  ["fuel", Fuel],
  ["ticket", Ticket],
  ["wallet", WalletCards],
  ["heart-pulse", HeartPulse],
];

const iconByName: Partial<Record<CategoryIconName, LucideIcon>> = {
  utensils: Utensils,
  car: CarFront,
  receipt: ReceiptText,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  home: Home,
  plane: Plane,
  briefcase: BriefcaseBusiness,
  gift: Gift,
  coffee: Coffee,
  fuel: Fuel,
  ticket: Ticket,
  wallet: WalletCards,
  "more-horizontal": MoreHorizontal,
};

export function getCategoryIcon(name: string, icon?: CategoryIconName): LucideIcon {
  if (icon) return iconByName[icon] ?? MoreHorizontal;
  const match = icons.find(([key]) => name.toLowerCase().includes(key));
  return match?.[1] ?? MoreHorizontal;
}

export function CategoryIcon({ name, icon, color, size = 20, filled = false }: { name: string; icon?: CategoryIconName; color?: string; size?: number; filled?: boolean }) {
  const { colors } = useLedgerTheme();
  const Icon = getCategoryIcon(name, icon);
  const tint = color ?? colors.accent;
  return (
    <View accessible accessibilityLabel={`${name} category`} style={{ width: size + 18, height: size + 18, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: `${tint}24` }}>
      {createElement(Icon, { size, color: tint, strokeWidth: filled ? 2.4 : 1.9 })}
    </View>
  );
}
