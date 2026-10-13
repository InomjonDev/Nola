"use client";

import { Briefcase, Car, Clapperboard, Coffee, Dumbbell, Fuel, Gift, HeartPulse, HomeFill, MoreHorizontal, Plane, Receipt, ShoppingBag, Ticket, Utensils, Wallet } from "@/components/icons";

import type { CategoryIconName } from "@/lib/types";

const icons = {
  utensils: Utensils,
  car: Car,
  receipt: Receipt,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  home: HomeFill,
  plane: Plane,
  briefcase: Briefcase,
  gift: Gift,
  coffee: Coffee,
  fuel: Fuel,
  ticket: Ticket,
  wallet: Wallet,
  "more-horizontal": MoreHorizontal,
} satisfies Record<CategoryIconName, typeof Utensils>;

export const categoryIconNames = Object.keys(icons) as CategoryIconName[];

const accentFamilies: Record<CategoryIconName, string> = {
  utensils: "tangerine", car: "green", receipt: "cobalt", "shopping-bag": "cobalt",
  clapperboard: "tangerine", dumbbell: "teal", "heart-pulse": "green", home: "cobalt",
  plane: "cobalt", briefcase: "teal", gift: "rose", coffee: "tangerine", fuel: "tangerine",
  ticket: "rose", wallet: "green", "more-horizontal": "teal",
};

export function categoryAccent(icon?: CategoryIconName) {
  return `var(--category-${accentFamilies[icon ?? "more-horizontal"] ?? "green"})`;
}

const categoryNameIcons: Record<string, CategoryIconName> = {
  food: "utensils",
  groceries: "shopping-bag",
  transport: "car",
  travel: "plane",
  bills: "receipt",
  shopping: "shopping-bag",
  entertainment: "clapperboard",
  fitness: "dumbbell",
  health: "heart-pulse",
  home: "home",
  work: "briefcase",
  gifts: "gift",
  coffee: "coffee",
  fuel: "fuel",
  tickets: "ticket",
};

export function CategoryIcon({ name, icon, className = "h-5 w-5", color, size }: { name?: string; icon?: CategoryIconName; className?: string; color?: string; size?: number }) {
  const normalizedIcon = icon && icon in icons ? icon : undefined;
  const normalizedName = name?.trim().toLowerCase();
  const iconName = (normalizedName ? categoryNameIcons[normalizedName] : undefined) ?? normalizedIcon ?? "more-horizontal";
  const Icon = icons[iconName] ?? MoreHorizontal;
  return <span className="category-icon-background" style={{ backgroundColor: `var(--category-${accentFamilies[iconName]}-bg)` }} aria-hidden="true"><Icon className={`category-glyph ${className}`} color={color ?? categoryAccent(iconName)} size={size ?? 20} /></span>;
}
