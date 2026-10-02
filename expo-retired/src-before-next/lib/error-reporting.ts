import { Platform } from "react-native";

type ErrorContext = {
  surface: string;
};

const endpoint = process.env.EXPO_PUBLIC_ERROR_REPORTING_URL?.trim();

function sanitize(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{1,14}(?:[.,]\d{1,2})?\b/g, "[number]")
    .slice(0, 240);
}

export function reportError(error: unknown, context: ErrorContext) {
  const source = error instanceof Error ? error : new Error(String(error));
  const payload = {
    event: "walletly_error",
    message: sanitize(source.message),
    name: sanitize(source.name),
    surface: context.surface,
    platform: Platform.OS,
    release: process.env.EXPO_PUBLIC_APP_VERSION ?? "development",
  };

  if (!endpoint) {
    if (__DEV__) console.error("Walletly error", payload);
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
