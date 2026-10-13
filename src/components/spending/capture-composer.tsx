"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { AiProcessingNotice } from "@/components/spending/ai-processing-notice";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n-provider";
import { extractHashtags } from "@/lib/spending-parser";

export function CaptureComposer({ folderId, onSaved, onClose, initialText = "", onSignIn, onManualEntry }: {
  folderId: string | null;
  onSaved: (captureId: string) => void;
  onClose: () => void;
  initialText?: string;
  onSignIn?: (sourceText: string) => void;
  onManualEntry?: (sourceText: string) => void;
}) {
  const store = useAppStore();
  const { t } = useI18n();
  const dialog = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const sourceField = useRef<HTMLTextAreaElement>(null);
  const [sourceText, setSourceText] = useState(initialText);
  const [showNotice, setShowNotice] = useState(false);
  const [error, setError] = useState("");

  useDialogFocus(dialog, backdrop, onClose);

  useEffect(() => {
    if (!showNotice) sourceField.current?.focus();
  }, [showNotice]);

  function saveCapture() {
    if (!sourceText.trim()) {
      setError(t("capture.textRequired"));
      return;
    }
    if (sourceText.length > 4000) {
      setError(t("capture.textTooLong"));
      return;
    }
    setError("");
    const tagIds = store.ensureTags(extractHashtags(sourceText));
    const captureId = store.saveSpendingCapture(sourceText, folderId, tagIds);
    if (!captureId) {
      setError(t("capture.saveError"));
      return;
    }
    onSaved(captureId);
    onClose();
  }

  function submitCapture() {
    if (!sourceText.trim()) {
      setError(t("capture.textRequired"));
      return;
    }
    if (sourceText.length > 4000) {
      setError(t("capture.textTooLong"));
      return;
    }
    setError("");
    if (store.user?.isDemo) setShowNotice(true);
    else if (store.profile?.aiParsingEnabled) saveCapture();
    else setShowNotice(true);
  }

  if (typeof document === "undefined") return null;

  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop fixed inset-0 z-50 flex">
    <section ref={dialog} tabIndex={-1} className="expense-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-composer-title">
      <header className="editor-toolbar">
        <button type="button" className="toolbar-action" onClick={onClose}>{t("common.cancel")}</button>
        <h2 id="capture-composer-title" className="editor-title">{showNotice ? t(store.user?.isDemo ? "capture.demoGateTitle" : "capture.privacyTitle") : t("capture.new")}</h2>
        <span aria-hidden="true" />
      </header>
      <div className="grid w-full gap-5 px-4 py-6 sm:px-6" style={{ maxWidth: 680, marginInline: "auto" }}>
        {showNotice ? <AiProcessingNotice open onContinue={saveCapture} onNotNow={() => { setShowNotice(false); setError(""); }} onSignIn={() => onSignIn?.(sourceText)} /> : <>
          <div className="grid gap-2">
            <label className="text-base font-semibold text-text" htmlFor="capture-source">{t("capture.noteLabel")}</label>
            <textarea
              ref={sourceField}
              id="capture-source"
              name="sourceText"
              data-autofocus
              className="input min-h-[240px] resize-y !rounded-2xl !border !border-control-edge !bg-surface !px-4 !py-4 leading-7"
              placeholder={t("capture.placeholder")}
              value={sourceText}
              maxLength={4200}
              aria-describedby="capture-helper capture-character-count"
              onChange={(event) => { setSourceText(event.target.value); setError(""); }}
            />
            <div className="flex items-start justify-between gap-4">
              <p id="capture-helper" className="max-w-prose text-sm leading-6 text-muted">{t("capture.helper")}</p>
              <span id="capture-character-count" className="shrink-0 pt-1 text-xs tabular-nums text-muted">{sourceText.length}/4000</span>
            </div>
          </div>
          {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            {onManualEntry
              ? <button type="button" className="control min-h-11 justify-center bg-raised text-text" onClick={() => onManualEntry(sourceText)}>{t("capture.manualEntry")}</button>
              : <span className="text-xs text-muted">{t("capture.autoSaveHint")}</span>}
            <button type="submit" form="capture-composer-form" className="control min-h-11 justify-center bg-accent px-5 font-semibold text-on-accent">{t("capture.save")}</button>
          </div>
          <form id="capture-composer-form" className="hidden" noValidate onSubmit={(event) => { event.preventDefault(); submitCapture(); }} />
          <p className="text-xs leading-5 text-muted">{t("capture.privacyShort")}</p>
        </>}
      </div>
    </section>
  </div>, document.body);
}
