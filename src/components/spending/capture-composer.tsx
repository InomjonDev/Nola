"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { Check, ChevronLeft, Plus } from "@/components/icons";
import { AiProcessingNotice } from "@/components/spending/ai-processing-notice";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { captureParseIssueMessage, type CaptureParseIssue } from "@/lib/capture-parse-issue";
import { useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n-provider";
import { extractHashtags } from "@/lib/spending-parser";

type SaveState = "idle" | "saving" | "saved";

export function CaptureComposer({ folderId, onSaved, onClose, initialText = "", issues = {}, onSignIn, onManualEntry }: {
  folderId: string | null;
  onSaved: (captureId: string) => void;
  onClose: () => void;
  initialText?: string;
  issues?: Record<string, CaptureParseIssue>;
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
  const [helpHovered, setHelpHovered] = useState(false);
  const [helpPinned, setHelpPinned] = useState(false);
  const helpOpen = helpHovered || helpPinned;
  const savedCapture = captureIdRef.current
    ? store.spendingCaptures.find((capture) => capture.id === captureIdRef.current)
    : undefined;
  const captureWaitingToSync = Boolean(savedCapture && store.syncQueue.some((operation) => operation.table === "spending_captures" && operation.recordId === savedCapture.id && operation.action === "upsert"));
  const liveParseMessage = savedCapture && store.user && !store.user.isDemo && store.profile?.aiParsingEnabled
    ? savedCapture.parseStatus === "processing" || (savedCapture.parseStatus === "pending" && saveState === "saved")
      ? !store.isOnline ? t("capture.offline") : captureWaitingToSync ? t("capture.syncPending") : t("capture.processing")
      : savedCapture.parseStatus === "parsed"
        ? t("capture.parseComplete").replace("{count}", String(savedCapture.parsedItems?.length ?? store.expenses.filter((expense) => expense.captureId === savedCapture.id && !expense.deletedAt).length))
        : savedCapture.parseStatus === "needs_retry"
          ? captureParseIssueMessage(issues[savedCapture.id], t)
          : null
    : null;
  const liveParseComplete = savedCapture?.parseStatus === "parsed";

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
    if (sourceTextRef.current.trim() && !flushAutoSave()) return;
    onManualEntry?.(sourceTextRef.current);
  }

  if (typeof document === "undefined") return null;

  return createPortal(<div ref={backdrop} className="expense-sheet-backdrop capture-editor-backdrop fixed inset-0 z-50 flex">
    <section ref={dialog} tabIndex={-1} className="expense-sheet capture-editor" role="dialog" aria-modal="true" aria-labelledby="capture-composer-title">
      <header className="editor-toolbar capture-editor-toolbar">
        <button type="button" className="capture-editor-back" aria-label={t("common.back")} title={t("common.back")} onClick={closeComposer}><ChevronLeft size={28} aria-hidden="true" /></button>
        <div className="capture-editor-title-group">
          <h2 id="capture-composer-title" className="editor-title">{showNotice ? t(store.user?.isDemo ? "capture.demoGateTitle" : "capture.privacyTitle") : t("history.today")}</h2>
          {!showNotice && <div
            className="capture-editor-help"
            onMouseEnter={() => setHelpHovered(true)}
            onMouseLeave={() => setHelpHovered(false)}
            onFocus={() => setHelpHovered(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHelpHovered(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && helpOpen) {
                event.preventDefault();
                event.stopPropagation();
                setHelpPinned(false);
                setHelpHovered(false);
              }
            }}
          >
            <button
              type="button"
              className="capture-editor-help-button"
              aria-label={t("capture.helpTitle")}
              aria-expanded={helpOpen}
              aria-controls="capture-help-popover"
              aria-describedby={helpOpen ? "capture-help-popover" : undefined}
              onClick={() => {
                const pinned = !helpPinned;
                setHelpPinned(pinned);
                setHelpHovered(false);
              }}
            ><span aria-hidden="true">?</span></button>
            {helpOpen && <div id="capture-help-popover" className="capture-editor-help-popover" role="tooltip">
              <p>{t("capture.helper")}</p>
              <p>{t("capture.autoSaveHint")}</p>
              <p>{t("capture.privacyShort")}</p>
            </div>}
          </div>}
        </div>
        <div className="capture-editor-actions">
          {!showNotice && <>
            <span className="capture-editor-save-status" id="capture-save-status" role="status" aria-live="polite">
              {saveState === "saving" ? t("capture.saving") : saveState === "saved" ? t("capture.autosaved") : ""}
            </span>
            <button type="button" className="toolbar-action capture-editor-done" onClick={submitCapture}>{t("common.done")}</button>
          </>}
        </div>
      </header>
      <div className={`capture-editor-content${showNotice ? " capture-editor-notice-content" : ""}`}>
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
            aria-describedby={helpOpen ? "capture-character-count capture-help-popover" : "capture-character-count"}
            onChange={(event) => queueAutoSave(event.target.value)}
          />
          {liveParseMessage && <div className="capture-editor-live-status" role="status" aria-live="polite" aria-atomic="true">
            {liveParseComplete ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="capture-editor-live-spinner" aria-hidden="true" />}
            <span className="truncate">{liveParseMessage}</span>
          </div>}
          <span id="capture-character-count" className="capture-editor-character-count">{sourceText.length}/4000</span>
          {error && <p className="capture-editor-error" role="alert">{error}</p>}
          {onManualEntry && <button type="button" className="capture-editor-add-button" aria-label={t("capture.manualEntry")} onClick={startManualEntry}><Plus className="h-6 w-6" aria-hidden="true" /></button>}
        </>}
      </div>
    </section>
  </div>, document.body);
}
