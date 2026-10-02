"use client";

import { type PropsWithChildren, useEffect } from "react";

import { AppStoreProvider } from "@/lib/app-store";
import { I18nProvider } from "@/lib/i18n-provider";
import { LedgerThemeProvider } from "@/theme/theme-provider";

export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <LedgerThemeProvider>
      <I18nProvider>
        <AppStoreProvider>{children}</AppStoreProvider>
      </I18nProvider>
    </LedgerThemeProvider>
  );
}
