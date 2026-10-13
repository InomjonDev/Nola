"use client";

import { useEffect, useState } from "react";

import { createTranslator, detectLanguage, languageLocale } from "@/lib/i18n";
import { reportError } from "@/lib/error-reporting";
import type { Language } from "@/lib/types";
import { themeInitScript, themeStyles } from "@/theme";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    reportError(error, { surface: "global-error-boundary" });
    let saved: string | null = null;
    try { saved = localStorage.getItem("walletly.language"); } catch { /* Use the browser language. */ }
    setLanguage(saved === "en" || saved === "ru" || saved === "uz" ? saved : detectLanguage(navigator.language));
  }, [error]);
  const t = createTranslator(language);
  return <html lang={languageLocale(language)} suppressHydrationWarning>
    <head><style dangerouslySetInnerHTML={{ __html: themeStyles }} /><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
    <body style={{ margin: 0, background: "rgb(var(--color-bg))", color: "rgb(var(--color-text))" }}>
      <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
        <section style={{ maxWidth: "420px", textAlign: "center" }}>
          <p style={{ fontWeight: 600 }}>Nola</p>
          <h1 style={{ fontSize: "22px", fontWeight: 600 }}>{t("common.errorTitle")}</h1>
          <p style={{ fontSize: "15px", lineHeight: 1.5, color: "rgb(var(--color-muted))" }}>{t("common.errorDetail")}</p>
          <button type="button" style={{ minHeight: "44px", padding: "8px 16px", border: 0, borderRadius: "8px", background: "rgb(var(--color-accent))", color: "rgb(var(--color-on-accent))", font: "inherit" }} onClick={() => reset()}>{t("common.retry")}</button>
        </section>
      </main>
    </body>
  </html>;
}
