import type { Category } from "@/lib/types";

export const GLOBAL_CATEGORIES: Category[] = [
  { id: "00000000-0000-4000-8000-000000000001", userId: null, name: "Food", color: "#2B8A68", icon: "utensils", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "00000000-0000-4000-8000-000000000002", userId: null, name: "Transport", color: "#3E75B8", icon: "car", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "00000000-0000-4000-8000-000000000003", userId: null, name: "Bills", color: "#B7782C", icon: "receipt", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "00000000-0000-4000-8000-000000000004", userId: null, name: "Shopping", color: "#9B5F86", icon: "shopping-bag", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "00000000-0000-4000-8000-000000000005", userId: null, name: "Entertainment", color: "#C85A4D", icon: "clapperboard", kind: "global", archivedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
];

export const CURRENCIES = ["USD", "EUR", "GBP", "UZS", "JPY", "CAD", "AUD"] as const;
export const WALLETLY_CURRENCIES = ["USD", "UZS", "RUB", "EUR", "GBP"] as const;
export const DEFAULT_PAYMENT_METHODS = ["Card", "Cash", "Bank transfer"] as const;
export const TAG_SUGGESTIONS = ["Work", "Personal", "Travel", "Recurring", "Shared"] as const;
export const APP_STORAGE_PREFIX = "walletly.app-data.v2";
export function appStorageKey(userId: string) {
  // SecureStore only accepts alphanumeric characters, dots, underscores, and hyphens.
  return `${APP_STORAGE_PREFIX}-${userId}`;
}
export function legacyAppStorageKey(userId: string) {
  return `${APP_STORAGE_PREFIX}:${userId}`;
}
export const DEMO_SESSION_KEY = "walletly.demo-session";
export const CONSENT_KEY = "walletly.privacy-consent.v1";
export const COOKIE_CONSENT_KEY = "walletly.cookie-consent.v1";
export const TOUR_SEEN_KEY = "walletly.tour-seen.v1";
