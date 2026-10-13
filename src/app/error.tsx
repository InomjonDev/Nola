"use client";

import { useEffect } from "react";

import { useI18n } from "@/lib/i18n-provider";
import { reportError } from "@/lib/error-reporting";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    reportError(error, { surface: "app-error-boundary" });
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-text">
      <section className="panel max-w-md">
        <p className="brand-wordmark">Nola</p>
        <h1 className="mt-4 screen-title">{t("common.errorTitle")}</h1>
        <p className="mt-3 text-sm text-muted">{t("common.errorDetail")}</p>
        <button className="control mt-6 justify-center bg-accent text-on-accent" onClick={() => reset()}>{t("common.retry")}</button>
      </section>
    </main>
  );
}
