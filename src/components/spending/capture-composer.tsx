"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { AiProcessingNotice } from "@/components/spending/ai-processing-notice";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n-provider";
import { extractHashtags } from "@/lib/spending-parser";

type SaveState = "idle" | "saving" | "saved";

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
  const sourceTextRef = useRef(initialText);
  const captureIdRef = useRef<string | null>(null);
  const lastSavedTextRef = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceText, setSourceText] = useState(initialText);
  const [showNotice, setShowNotice] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useDialogFocus(dialog, backdrop, closeComposer);

  useEffect(() => {
    if (!showNotice) sourceField.current?.focus();
  }, [showNotice]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function persistDraft(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return captureIdRef.current;
    if (value.length > 4000) {
      setError(t("capture.textTooLong"));
      setSaveState("idle");
      return null;
    }
    if (captureIdRef.current && value === lastSavedTextRef.current) {
      setSaveState("saved");
      return captureIdRef.current;
    }

    setError("");
    const tagIds = store.ensureTags(extractHashtags(value));
    const captureId = captureIdRef.current
      ? store.editCaptureSourceText(captureIdRef.current, value, tagIds) ? captureIdRef.current : null
      : store.saveSpendingCapture(value, folderId, tagIds) || null;
    if (!captureId) {
      setError(t("capture.saveError"));
      setSaveState("idle");
      return null;
    }

    captureIdRef.current = captureId;
    lastSavedTextRef.current = value;
    setSaveState("saved");
    return captureId;
  }

  function flushAutoSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    return persistDraft(sourceTextRef.current);
  }

  function queueAutoSave(value: string) {
    sourceTextRef.current = value;
    setSourceText(value);
    setError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!value.trim()) {
      setSaveState(captureIdRef.current ? "saved" : "idle");
      return;
    }
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persistDraft(value);
    }, 400);
  }

  function closeComposer() {
    if (!sourceTextRef.current.trim()) {
      onClose();
      return;
    }
    const captureId = flushAutoSave();
    if (!captureId) return;
    onSaved(captureId);
    onClose();
  }

  function finishCapture() {
    if (!sourceTextRef.current.trim()) {
      setError(t("capture.textRequired"));
      return;
    }
    if (sourceTextRef.current.length > 4000) {
      setError(t("capture.textTooLong"));
      return;
    }
    const captureId = flushAutoSave();
    if (!captureId) {
      setError(t("capture.saveError"));
      return;
    }
    onSaved(captureId);
    onClose();
  }

  function submitCapture() {
    if (!sourceTextRef.current.trim()) {
      setError(t("capture.textRequired"));
      return;
    }
    if (sourceTextRef.current.length > 4000) {
      setError(t("capture.textTooLong"));
      return;
    }
    if (!flushAutoSave()) {
      setError(t("capture.saveError"));
      return;
    }
    setError("");
    if (store.user?.isDemo || !store.profile?.aiParsingEnabled) setShowNotice(true);
    else finishCapture();
  }

  function startManualEntry() {
    flushAutoSave();
    onManualEntry?.(sourceTextRef.current);
  }

  if (typeof document === "undefined") return null;

  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop capture-editor-backdrop fixed inset-0 z-50 flex">
    <section ref={dialog} tabIndex={-1} className="expense-sheet capture-editor" role="dialog" aria-modal="true" aria-labelledby="capture-composer-title">
      <header className="editor-toolbar capture-editor-toolbar">
        <button type="button" className="toolbar-action" onClick={closeComposer}>{t("common.close")}</button>
        <h2 id="capture-composer-title" className="editor-title">{showNotice ? t(store.user?.isDemo ? "capture.demoGateTitle" : "capture.privacyTitle") : t("capture.new")}</h2>
        {!showNotice
          ? <button type="button" className="toolbar-action capture-editor-done" onClick={submitCapture}>{t("common.done")}</button>
          : <span aria-hidden="true" />}
      </header>
      <div className="capture-editor-content">
        {showNotice ? <AiProcessingNotice open onContinue={finishCapture} onNotNow={() => { setShowNotice(false); setError(""); }} onSignIn={() => { flushAutoSave(); onSignIn?.(sourceTextRef.current); }} /> : <>
          <label className="sr-only" htmlFor="capture-source">{t("capture.noteLabel")}</label>
          <textarea
            ref={sourceField}
            id="capture-source"
            name="sourceText"
            data-autofocus
            className="capture-note-body"
            placeholder={t("capture.placeholder")}
            value={sourceText}
            maxLength={4200}
            aria-describedby="capture-helper capture-character-count capture-save-status"
            onChange={(event) => queueAutoSave(event.target.value)}
          />
          <div className="capture-editor-meta">
            <p id="capture-helper" className="max-w-prose text-sm leading-6 text-muted">{t("capture.helper")}</p>
            <span id="capture-character-count" className="shrink-0 pt-1 text-xs tabular-nums text-muted">{sourceText.length}/4000</span>
          </div>
          <div className="capture-editor-footer">
            <span id="capture-save-status" className="text-xs text-muted" role="status" aria-live="polite">
              {saveState === "saving" ? t("capture.saving") : saveState === "saved" ? t("capture.autosaved") : t("capture.autoSaveHint")}
            </span>
            {onManualEntry && <button type="button" className="control min-h-11 justify-center bg-raised text-text" onClick={startManualEntry}>{t("capture.manualEntry")}</button>}
          </div>
          {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
          <p className="text-xs leading-5 text-muted">{t("capture.privacyShort")}</p>
        </>}
      </div>
    </section>
  </div>, document.body);
}
