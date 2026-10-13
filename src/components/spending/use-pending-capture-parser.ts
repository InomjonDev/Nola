"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAppStore } from "@/lib/app-store";
import { captureParseIssueFromError, type CaptureParseIssue } from "@/lib/capture-parse-issue";
import { supabase } from "@/lib/supabase";
import type { ParsedCaptureItem, SpendingCapture } from "@/lib/types";

type ParseResponse = { captureId: string; parseRevision: number; items: ParsedCaptureItem[] };

function currentLocalDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseResponse(value: unknown): value is ParseResponse {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ParseResponse>;
  return typeof result.captureId === "string"
    && typeof result.parseRevision === "number"
    && Array.isArray(result.items);
}

export function usePendingCaptureParser({ paused = false }: { paused?: boolean } = {}) {
  const store = useAppStore();
  const [issues, setIssues] = useState<Record<string, CaptureParseIssue>>({});
  const inFlight = useRef(new Set<string>());
  const latestCaptures = useRef(store.spendingCaptures);
  latestCaptures.current = store.spendingCaptures;

  const retryCapture = useCallback((captureId: string) => {
    const capture = latestCaptures.current.find((item) => item.id === captureId && !item.deletedAt
      && (item.parseStatus === "needs_retry" || (item.parseStatus === "pending" && issues[captureId] === "sync")));
    if (!capture) return;
    setIssues((current) => {
      const next = { ...current };
      delete next[captureId];
      return next;
    });
    store.setCaptureParseStatus(capture.id, capture.parseRevision, "pending");
  }, [issues, store]);

  useEffect(() => {
    if (!store.user || store.user.isDemo) return;
    setIssues((current) => {
      let changed = false;
      const next = { ...current };
      for (const [captureId, issue] of Object.entries(next)) {
        if (issue === "signIn") {
          delete next[captureId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [store.user?.id, store.user?.isDemo]);

  useEffect(() => {
    const { user, profile, isOnline, spendingCaptures, syncQueue } = store;
    for (const capture of spendingCaptures) {
      if (capture.deletedAt || capture.parseStatus !== "parsed" || capture.parsedRevision !== capture.parseRevision || !capture.parsedItems?.length) continue;
      const parsedIds = new Set(capture.parsedItems.map((item) => item.id));
      const hasMissingRows = capture.parsedItems.some((item) => !store.expenses.some((expense) => expense.id === item.id));
      const hasOldActiveRows = store.expenses.some((expense) => expense.captureId === capture.id && !expense.deletedAt && !parsedIds.has(expense.id));
      if (hasMissingRows || hasOldActiveRows) store.replayCachedCaptureParse(capture.id, capture.parseRevision);
    }
    if (paused || !isOnline || (typeof navigator !== "undefined" && !navigator.onLine) || !profile?.aiParsingEnabled || !user) return;

    const activeCaptures = spendingCaptures.filter((capture) => !capture.deletedAt && capture.parseStatus === "pending");
    for (const capture of activeCaptures) {
      if (issues[capture.id] === "sync") continue;
      const captureUpsertPending = syncQueue.some((operation) => operation.table === "spending_captures" && operation.recordId === capture.id && operation.action === "upsert");
      if (captureUpsertPending) continue;
      const flightKey = `${capture.id}:${capture.parseRevision}`;
      if (inFlight.current.has(flightKey)) continue;
      inFlight.current.add(flightKey);

      void (async () => {
        const fail = (issue: CaptureParseIssue) => {
          const current = latestCaptures.current.find((item) => item.id === capture.id);
          if (current && !current.deletedAt && current.parseRevision === capture.parseRevision) {
            store.setCaptureParseStatus(capture.id, capture.parseRevision, issue === "sync" ? "pending" : "needs_retry");
            setIssues((existing) => ({ ...existing, [capture.id]: issue }));
          }
        };

        store.setCaptureParseStatus(capture.id, capture.parseRevision, "processing");
        try {
          if (!supabase || user.isDemo) {
            fail("signIn");
            return;
          }
          const { data, error } = await supabase.auth.getSession();
          const session = data.session;
          if (error || !session?.access_token || session.user.id !== user.id) {
            fail("signIn");
            return;
          }

          const response = await fetch("/api/spending-captures/parse", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              captureId: capture.id,
              parseRevision: capture.parseRevision,
              sourceText: capture.sourceText,
              localDate: currentLocalDate(capture.capturedAt),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            }),
          });
          if (!response.ok) {
            const failure: unknown = await response.json().catch(() => null);
            const errorCode = failure && typeof failure === "object" ? (failure as { error?: unknown }).error : null;
            fail(response.status === 401 ? "signIn" : captureParseIssueFromError(errorCode));
            return;
          }
          const result: unknown = await response.json();
          if (!parseResponse(result) || result.captureId !== capture.id || result.parseRevision !== capture.parseRevision) {
            fail("retry");
            return;
          }

          const current: SpendingCapture | undefined = latestCaptures.current.find((item) => item.id === capture.id);
          if (!current || current.deletedAt || current.parseRevision !== capture.parseRevision || current.parseStatus === "undone") return;
          if (!store.setCaptureParseResult(capture.id, capture.parseRevision, result.items)) fail("retry");
          else setIssues((existing) => {
            if (!(capture.id in existing)) return existing;
            const next = { ...existing };
            delete next[capture.id];
            return next;
          });
        } catch {
          fail("retry");
        } finally {
          inFlight.current.delete(flightKey);
        }
      })();
    }
  }, [issues, paused, store]);

  return { issues, retryCapture };
}
