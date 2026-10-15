"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useI18n } from "@/lib/i18n-provider";
import { useAppStore } from "@/lib/app-store";

export function AiProcessingNotice({ open, onContinue, onNotNow }: { open: boolean; onContinue: () => void; onNotNow: () => void }) {
  const store = useAppStore();
  const { t } = useI18n();
  const continueButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { continueButton.current?.focus(); }, []);
  if (!open) return null;

  return <section className="grid gap-4 rounded-2xl border border-line bg-raised p-5" aria-labelledby="ai-processing-title" aria-describedby="ai-processing-description">
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("capture.privacyEyebrow")}</p>
      <h3 id="ai-processing-title" className="text-xl font-semibold tracking-tight text-text">{t("capture.privacyTitle")}</h3>
      <p id="ai-processing-description" className="text-sm leading-6 text-muted">{t("capture.privacyDetail")}</p>
      <Link className="min-h-11 w-fit content-center text-sm font-semibold text-accent underline underline-offset-4" href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">{t("capture.providerPrivacy")}</Link>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      <button ref={continueButton} type="button" className="control justify-center bg-accent text-on-accent" data-autofocus onClick={() => { store.setAiParsingEnabled(true); onContinue(); }}>{t("capture.continue")}</button>
      <button type="button" className="control justify-center bg-bg text-text" onClick={onNotNow}>{t("capture.notNow")}</button>
    </div>
  </section>;
}
