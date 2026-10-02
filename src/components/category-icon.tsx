"use client";

import { Briefcase, Car, Clapperboard, Coffee, Dumbbell, Fuel, Gift, HeartPulse, Home, MoreHorizontal, Plane, Receipt, ShoppingBag, Ticket, Utensils, Wallet } from "lucide-react";

import type { CategoryIconName } from "@/lib/types";

const icons = {
  utensils: Utensils,
  car: Car,
  receipt: Receipt,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  home: Home,
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
  const iconName = normalizedIcon ?? (normalizedName ? categoryNameIcons[normalizedName] : undefined) ?? "more-horizontal";
  const Icon = icons[iconName] ?? MoreHorizontal;
  return <Icon className={className} color={color} size={size} aria-hidden="true" />;
}
